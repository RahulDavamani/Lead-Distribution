import { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { RoleType } from '../../../../stores/auth.store';
import { getLeadsWhere } from './getLeadsWhere';

export const getCompletedLeads = async (UserKey: string, roleType: RoleType, dateRange: string[]) => {
	const where = getLeadsWhere(roleType, UserKey) as Prisma.LdLeadCompletedWhereInput;

	const startDate = new Date(dateRange[0]);
	const endDate = new Date(dateRange[1]);
	endDate.setDate(endDate.getDate() + 1);

	const leads = await prisma.ldLeadCompleted
		.findMany({
			where: {
				...where,
				updatedAt: { gte: startDate, lte: endDate }
			},
			include: {
				rule: { select: { name: true } },
				calls: {
					orderBy: { createdAt: 'desc' },
					select: { createdAt: true, UserKey: true }
				}
			}
		})
		.catch(prismaErrorHandler);

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
		where: { UserKey: { in: leads.map((lead) => lead.UserKey!).filter(Boolean) } },
		select: {
			UserKey: true,
			VonageAgentId: true,
			FirstName: true,
			LastName: true
		}
	});

	const vonageCalls =
		(await prisma.$queryRaw`Select Guid, Duration from VonageCalls where Guid in (${Prisma.join(leads.map((lead) => lead.VonageGUID).filter(Boolean))})`.catch(
			prismaErrorHandler
		)) as { Guid: string; Duration: string | null }[];

	const allWorkingHours = await prisma.ldRuleCompanyWorkingHours.findMany({
		where: {
			ruleCompany: {
				ruleId: { in: leads.map((lead) => lead.ruleId!).filter(Boolean) },
				CompanyKey: { in: leads.map((lead) => lead.CompanyKey!).filter(Boolean) }
			}
		},
		select: {
			id: true,
			ruleCompany: { select: { ruleId: true, CompanyKey: true } },
			start: true,
			end: true,
			days: true
		}
	});

	const completedLeads = await Promise.all(
		leads.map(async (lead) => {
			const prospectDetails = prospects.find(
				(prospect) => prospect.ProspectKey.toLowerCase() === lead.ProspectKey.toLowerCase()
			)!;
			const affiliate = affiliates.find((affiliate) => affiliate.CompanyKey === prospectDetails.CompanyKey);
			const prospect = { ...prospectDetails, CompanyName: affiliate?.CompanyName };
			const company = companies.find((company) => company.CompanyKey === lead.CompanyKey);
			const user = users.find((user) => user.UserKey === lead.UserKey);
			const userStr = user ? `${user.VonageAgentId}: ${user.FirstName} ${user.LastName}` : undefined;
			const customerTalkTime = Number(vonageCalls.find((call) => call.Guid === lead.VonageGUID)?.Duration ?? '0');
			const workingHours = allWorkingHours.find(
				({ ruleCompany: { ruleId, CompanyKey } }) => ruleId === lead.ruleId && CompanyKey === lead.CompanyKey
			);

			return { ...lead, prospect, company, user: userStr, customerTalkTime, workingHours };
		})
	);

	completedLeads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

	return completedLeads;
};
