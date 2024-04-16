import type { Prisma } from '@prisma/client';
import type { RoleType } from '../../../../stores/auth.store';
import { getLeadsWhere } from './getLeadsWhere';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getProspect } from './getProspect';
import { getUserStr } from './user';
import { getCompanyValues } from './company';
import { getLeadResponseTime } from './getLeadResponseTime';

export const getQueuedLeads = async (UserKey: string, roleType: RoleType) => {
	const where = (await getLeadsWhere(roleType, UserKey)) as Prisma.LdLeadWhereInput;

	const leads = await prisma.ldLead
		.findMany({
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
					select: { createdAt: true, UserKey: true }
				},

				responses: {
					where: { type: 'disposition' },
					orderBy: { createdAt: 'desc' },
					take: 1,
					select: { responseValue: true }
				}
			}
		})
		.catch(prismaErrorHandler);

	// Fetch Lead Details
	const detailLeads = await Promise.all(
		leads.map(async (lead) => ({
			...lead,
			isNewLead: lead.notificationProcesses.length === 0 || lead.notificationProcesses[0].callbackNum === 0,
			prospect: await getProspect(lead.ProspectKey),
			company: lead.CompanyKey ? await getCompanyValues(lead.CompanyKey) : undefined,
			latestCall: lead.calls.length
				? {
						...lead.calls[0],
						userStr: lead.calls[0].UserKey ? await getUserStr(lead.calls[0].UserKey) : undefined
					}
				: undefined,
			leadResponseTime: await getLeadResponseTime(lead.id)
		}))
	);

	// Filter Leads
	let filteredLeads = detailLeads;
	if (roleType === 'AGENT')
		filteredLeads = await Promise.all(
			detailLeads.filter(async ({ rule, isNewLead }) => {
				const operator = await prisma.ldRuleOperator
					.findUnique({
						where: { ruleId_UserKey: { ruleId: rule?.id ?? '', UserKey: UserKey } },
						select: { assignNewLeads: true, assignCallbackLeads: true }
					})
					.catch(prismaErrorHandler);
				if (operator)
					if ((isNewLead && operator.assignNewLeads) || (!isNewLead && operator.assignCallbackLeads)) return true;
				return false;
			})
		);

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
