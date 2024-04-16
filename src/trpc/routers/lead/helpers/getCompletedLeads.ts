import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { RoleType } from '../../../../stores/auth.store';
import { getLeadsWhere } from './getLeadsWhere';
import { getUserStr } from './user';
import { getCompanyValues } from './company';
import { getProspect } from './getProspect';
import { getLeadResponseTime } from './getLeadResponseTime';

const getCustomerTalkTime = async (VonageGUID: string) =>
	Number(
		(
			(await prisma.$queryRaw`Select Duration from VonageCalls where Guid=${VonageGUID}`.catch(prismaErrorHandler)) as {
				Duration: string | null;
			}[]
		)?.[0]?.Duration ?? '0'
	);

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

	const completedLeads = await Promise.all(
		leads.map(async (lead) => ({
			...lead,
			prospect: await getProspect(lead.ProspectKey),
			company: lead.CompanyKey ? await getCompanyValues(lead.CompanyKey) : undefined,
			customerTalkTime: lead.VonageGUID ? await getCustomerTalkTime(lead.VonageGUID) : 0,
			user: lead.UserKey ? await getUserStr(lead.UserKey) : undefined,
			leadResponseTime: await getLeadResponseTime(lead.id)
		}))
	);

	completedLeads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

	return { completedLeads };
};
