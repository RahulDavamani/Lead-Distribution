import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const getQueuedLeads = async (UserKey: string, roleType: 'ADMIN' | 'SUPERVISOR' | 'AGENT') => {
	let where: Prisma.LdLeadWhereInput = {};
	switch (roleType) {
		case 'ADMIN':
			where = {};
			break;

		case 'SUPERVISOR':
			where = { rule: { supervisors: { some: { UserKey } } } };
			break;

		case 'AGENT':
			// eslint-disable-next-line no-case-declarations
			const { CompanyKey } = await prisma.users.findUniqueOrThrow({
				where: { UserKey },
				select: { CompanyKey: true }
			});
			where = {
				rule: { operators: { some: { UserKey } } },
				OR: [{ CompanyKey }, { CompanyKey: null }]
			};
			break;
	}

	const leads = await prisma.ldLead.findMany({
		where,
		include: {
			rule: {
				select: {
					id: true,
					name: true,
					supervisors: UserKey
						? {
								where: { UserKey },
								select: { UserKey: true, isRequeue: true }
							}
						: undefined
				}
			},

			notificationProcesses: {
				orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
				take: 1,
				select: {
					createdAt: true,
					callbackNum: true,
					requeueNum: true,
					status: true,
					notificationAttempts: {
						orderBy: { createdAt: 'desc' },
						take: 1,
						select: {
							UserKey: true,
							attempt: { select: { num: true } }
						}
					},
					escalations: {
						orderBy: { createdAt: 'desc' },
						take: 1,
						select: {
							UserKey: true,
							escalation: { select: { num: true } }
						}
					}
				}
			},

			calls: {
				orderBy: { createdAt: 'desc' },
				take: 1,
				select: { createdAt: true, UserKey: true }
			},

			responses: {
				where: { type: 'disposition' },
				orderBy: { createdAt: 'desc' },
				take: 1,
				select: { createdAt: true, responseValue: true }
			}
		}
	});

	const prospects = await prisma.leadProspect.findMany({
		where: { ProspectKey: { in: leads.map((lead) => lead.ProspectKey) } },
		select: {
			ProspectKey: true,
			ProspectId: true,
			CustomerFirstName: true,
			CustomerLastName: true,
			Address: true,
			ZipCode: true,
			CompanyKey: true
		}
	});

	const affiliates = (await prisma.$queryRaw`select CompanyKey, CompanyName from v_AffilateLeadDistribution`) as {
		CompanyKey: string;
		CompanyName: string;
	}[];

	const companies = await prisma.companies.findMany({
		where: { CompanyKey: { in: leads.map((lead) => lead.CompanyKey!).filter(Boolean) } },
		select: { CompanyKey: true, CompanyName: true }
	});

	const users = await prisma.users.findMany({
		// eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
		where: { UserKey: { in: leads.map((lead) => lead.calls?.[0]?.UserKey!).filter(Boolean) } },
		select: {
			UserKey: true,
			VonageAgentId: true,
			FirstName: true,
			LastName: true
		}
	});

	const ruleCompanies = await prisma.ldRuleCompany.findMany({
		where: {
			ruleId: { in: leads.map((lead) => lead.ruleId!).filter(Boolean) },
			CompanyKey: { in: leads.map((lead) => lead.CompanyKey!).filter(Boolean) }
		},
		select: {
			ruleId: true,
			CompanyKey: true,
			timezone: true,
			workingHours: {
				select: {
					id: true,
					start: true,
					end: true,
					days: true
				}
			}
		}
	});

	// Fetch Lead Details
	const detailLeads = leads.map((lead) => {
		const isNewLead = lead.notificationProcesses.length === 0 || lead.notificationProcesses[0].callbackNum === 0;
		const prospectDetails = prospects.find(
			(prospect) => prospect.ProspectKey.toLowerCase() === lead.ProspectKey.toLowerCase()
		)!;
		const affiliate = affiliates.find((affiliate) => affiliate.CompanyKey === prospectDetails.CompanyKey);
		const prospect = { ...prospectDetails, CompanyName: affiliate?.CompanyName };
		const company = companies.find((company) => company.CompanyKey === lead.CompanyKey);
		const latestCallUser = users.find((user) => user.UserKey === lead.calls?.[0]?.UserKey);
		const latestCallUserStr = latestCallUser
			? `${latestCallUser.VonageAgentId}: ${latestCallUser.FirstName} ${latestCallUser.LastName}`
			: undefined;
		const latestCall = lead.calls[0] ? { ...lead.calls[0], userStr: latestCallUserStr } : undefined;
		const ruleCompany = ruleCompanies.find(
			({ ruleId, CompanyKey }) => ruleId === lead.ruleId && CompanyKey === lead.CompanyKey
		);

		return {
			...lead,
			isNewLead,
			prospect,
			company: lead.CompanyKey ? { ...company, ...ruleCompany } : undefined,
			latestCall
		};
	});

	// Filter Leads
	let filteredLeads = detailLeads;
	if (roleType === 'AGENT') {
		const operators = await prisma.ldRuleOperator.findMany({
			where: {
				UserKey,
				ruleId: { in: leads.map((lead) => lead.ruleId!).filter(Boolean) }
			},
			select: {
				ruleId: true,
				assignNewLeads: true,
				assignCallbackLeads: true
			}
		});

		filteredLeads = detailLeads.filter(async ({ ruleId, isNewLead }) => {
			const operator = operators.find((operator) => operator.ruleId === ruleId);
			if (operator)
				if ((isNewLead && operator.assignNewLeads) || (!isNewLead && operator.assignCallbackLeads)) return true;
			return false;
		});
	}

	// Sort Leads
	const newLeads = filteredLeads.filter(({ isNewLead }) => isNewLead);
	const callbackLeads = filteredLeads.filter(({ isNewLead }) => !isNewLead);
	newLeads.sort((a, b) => (a.prospect.ProspectId ?? 0) - (b.prospect.ProspectId ?? 0));
	callbackLeads.sort(
		(a, b) =>
			(b.notificationProcesses[0].createdAt.getTime() ?? 0) - (a.notificationProcesses[0].createdAt.getTime() ?? 0)
	);

	return [...newLeads, ...callbackLeads];
};
