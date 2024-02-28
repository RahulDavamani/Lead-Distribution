import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { RoleType } from '../../../../stores/auth.store';
import { getLeadsWhere } from './getLeadsWhere';
import { getProspectDetails } from './getProspectDetails';
import { getUserStr } from './user';

export const getCompletedLeads = async (UserKey: string, roleType: RoleType, dateRange: string[]) => {
	const where = getLeadsWhere(roleType, UserKey) as Prisma.LdLeadCompletedWhereInput;

	const startDate = new Date(dateRange[0]);
	const endDate = new Date(dateRange[1]);
	endDate.setDate(endDate.getDate() + 1);

	const completedLeads = await Promise.all(
		(
			await prisma.ldLeadCompleted
				.findMany({
					where: {
						...where,
						updatedAt: { gte: startDate, lte: endDate }
					},
					include: {
						rule: { select: { name: true } }
					}
				})
				.catch(prismaErrorHandler)
		).map(async (lead) => {
			const customerTalkTime = lead.VonageGUID
				? Number(
						(
							(await prisma.$queryRaw`Select Duration from VonageCalls where Guid=${lead.VonageGUID}`.catch(
								prismaErrorHandler
							)) as { Duration: string | null }[]
						)?.[0]?.Duration ?? '0'
					)
				: 0;
			return {
				...lead,
				prospectDetails: { ...(await getProspectDetails(lead.ProspectKey)) },
				customerTalkTime,
				user: lead.UserKey ? await getUserStr(lead.UserKey) : undefined
			};
		})
	);
	completedLeads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

	return { completedLeads };
};
