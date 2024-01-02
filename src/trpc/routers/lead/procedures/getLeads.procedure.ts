import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Affiliate } from '../../../../zod/affiliate.schema';
import type { Operator } from '../../../../zod/operator.schema';
import { procedure } from '../../../server';
import { getUserId } from '../helpers/getUserValues';

export const getLeadDetails = async (ProspectKey: string, UserId: number | null) => {
	const prospect = await prisma.leadProspect.findFirst({ where: { ProspectKey } }).catch(prismaErrorHandler);
	const affiliates = (
		prospect?.CompanyKey
			? await prisma.$queryRaw`select * from v_AffilateLeadDistribution where CompanyKey=${prospect?.CompanyKey}`.catch(
					prismaErrorHandler
			  )
			: []
	) as (Affiliate | undefined)[];
	const rule = affiliates[0]?.CompanyKey
		? await prisma.ldRule
				.findFirst({
					where: { affiliates: { some: { CompanyKey: affiliates[0]?.CompanyKey } } }
				})
				.catch(prismaErrorHandler)
		: undefined;
	const operators = (
		UserId ? await prisma.$queryRaw`select * from VonageUsers where UserId=${UserId}`.catch(prismaErrorHandler) : []
	) as (Operator | undefined)[];

	return {
		ProspectId: prospect?.ProspectId,
		customerDetails: {
			Name: `${prospect?.CustomerFirstName ?? ''} ${prospect?.CustomerLastName ?? ''}`,
			Address: `${prospect?.Address ?? ''} ${prospect?.ZipCode ?? ''}`
		},
		companyName: affiliates[0]?.CompanyName ?? 'N/A',
		operatorName: operators[0]?.Name ?? 'N/A',
		ruleId: rule?.id,
		ruleName: rule?.name ?? 'N/A'
	};
};

export const getQueuedProcedure = procedure
	.input(z.object({ UserKey: z.string().min(1).optional() }))
	.query(async ({ input: { UserKey } }) => {
		const UserId = await getUserId(UserKey);
		const queuedLeads = (
			await Promise.all(
				(
					await prisma.ldLead.findMany({
						where: { isCompleted: false, attempts: UserId ? { some: { UserId } } : undefined }
					})
				).map(async (lead) => {
					const leadDetails = await getLeadDetails(lead.ProspectKey, lead.UserId);
					return { ...lead, ...leadDetails };
				})
			)
		).sort((a, b) => (a.ProspectId ?? 0) - (b.ProspectId ?? 0));

		return { queuedLeads };
	});

export const getCompletedProcedure = procedure
	.input(
		z.object({
			dateRange: z.array(z.string()).length(2),
			UserKey: z.string().min(1).optional()
		})
	)
	.query(async ({ input: { dateRange, UserKey } }) => {
		const startDate = new Date(dateRange[0]);
		const endDate = new Date(dateRange[1]);
		endDate.setDate(endDate.getDate() + 1);

		const UserId = await getUserId(UserKey);
		const completedLeads = (
			await Promise.all(
				(
					await prisma.ldLead.findMany({
						where: {
							isCompleted: true,
							updatedAt: { gte: startDate, lte: endDate },
							attempts: UserId ? { some: { UserId } } : undefined
						}
					})
				).map(async (lead) => {
					const leadDetails = await getLeadDetails(lead.ProspectKey, lead.UserId);
					return { ...lead, ...leadDetails };
				})
			)
		).sort((a, b) => (a.ProspectId ?? 0) - (b.ProspectId ?? 0));

		return { completedLeads };
	});
