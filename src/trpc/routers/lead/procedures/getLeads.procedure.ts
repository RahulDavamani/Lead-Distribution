import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Affiliate } from '../../../../zod/affiliate.schema';
import { procedure } from '../../../server';
import { getUserId, getUserKey, getUserName } from '../helpers/getUserValues';
import { roleTypeSchema } from '../../../../stores/auth.store';
import type { Prisma } from '@prisma/client';

export const getProspectDetails = async (ProspectKey: string) => {
	try {
		const { ProspectId, CompanyKey, CustomerFirstName, CustomerLastName, Address, ZipCode } = await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey },
				select: {
					ProspectId: true,
					CompanyKey: true,
					CustomerFirstName: true,
					CustomerLastName: true,
					Address: true,
					ZipCode: true
				}
			})
			.catch(prismaErrorHandler);

		let CompanyName;
		try {
			CompanyName = (
				(CompanyKey
					? await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${CompanyKey}`.catch(
							prismaErrorHandler
					  )
					: []) as (Affiliate | undefined)[]
			)[0]?.CompanyName;
		} catch (error) {
			CompanyName = undefined;
		}

		return {
			ProspectId: ProspectId,
			CustomerName: `${CustomerFirstName ?? ''} ${CustomerLastName ?? ''}`,
			CustomerAddress: `${Address ?? ''} ${ZipCode ?? ''}`,
			CompanyName
		};
	} catch (error) {
		return undefined;
	}
};

const getLeadWhere = (roleType: string, UserId?: number) => {
	let where: Prisma.LdLeadWhereInput = {};
	switch (roleType) {
		case 'ADMIN':
			where = {};
			break;

		case 'SUPERVISOR':
			where = { rule: { supervisors: { some: { UserId } } } };
			break;

		case 'AGENT':
			where = { attempts: { some: { UserId } } };
			break;
	}
	return where;
};

export const getQueuedProcedure = procedure
	.input(z.object({ UserKey: z.string().min(1), roleType: roleTypeSchema }))
	.query(async ({ input: { UserKey, roleType } }) => {
		const UserId = await getUserId(UserKey);
		const queuedLeads = await Promise.all(
			(
				await prisma.ldLead
					.findMany({
						where: { isCompleted: false, ...getLeadWhere(roleType, UserId) },
						include: {
							rule: {
								select: {
									name: true,
									supervisors: { where: { UserId }, select: { isRequeue: true } }
								}
							},
							calls: {
								orderBy: { createdAt: 'desc' },
								take: 1,
								select: { UserId: true }
							}
						}
					})
					.catch(prismaErrorHandler)
			).map(async (lead) => {
				const prospectDetails = await getProspectDetails(lead.ProspectKey);
				const operatorName = UserId ? await getUserName(UserId) : undefined;
				const latestCallUserKey = lead.calls[0]?.UserId ? await getUserKey(lead.calls[0].UserId) : undefined;
				return { ...lead, ...prospectDetails, operatorName, latestCallUserKey };
			})
		);
		queuedLeads.sort((a, b) => (a.ProspectId ?? 0) - (b.ProspectId ?? 0));

		return { queuedLeads };
	});

export const getCompletedProcedure = procedure
	.input(
		z.object({
			dateRange: z.array(z.string()).length(2),
			UserKey: z.string().min(1),
			roleType: roleTypeSchema
		})
	)
	.query(async ({ input: { dateRange, UserKey, roleType } }) => {
		const startDate = new Date(dateRange[0]);
		const endDate = new Date(dateRange[1]);
		endDate.setDate(endDate.getDate() + 1);
		const UserId = await getUserId(UserKey);

		const completedLeads = await Promise.all(
			(
				await prisma.ldLead
					.findMany({
						where: {
							updatedAt: { gte: startDate, lte: endDate },
							isCompleted: true,
							...getLeadWhere(roleType, UserId)
						},
						include: { rule: { select: { name: true } } }
					})
					.catch(prismaErrorHandler)
			).map(async (lead) => {
				const prospectDetails = await getProspectDetails(lead.ProspectKey);
				const operatorName = UserId ? await getUserName(UserId) : undefined;
				return { ...lead, ...prospectDetails, operatorName };
			})
		);
		completedLeads.sort((a, b) => (a.ProspectId ?? 0) - (b.ProspectId ?? 0));

		return { completedLeads };
	});

export const getLeadDetailsProcedure = procedure
	.input(z.object({ id: z.string().min(1) }))
	.query(async ({ input: { id } }) => {
		const lead = await prisma.ldLead
			.findUniqueOrThrow({
				where: { id },
				select: {
					ProspectKey: true,
					history: { orderBy: { createdAt: 'asc' } },
					attempts: { orderBy: { createdAt: 'asc' } },
					calls: { orderBy: { createdAt: 'asc' } },
					requeues: { orderBy: { createdAt: 'asc' } },
					dispositions: { orderBy: { createdAt: 'asc' } }
				}
			})
			.catch(prismaErrorHandler);

		const attempts = [];
		for (const attempt of lead.attempts) attempts.push({ ...attempt, name: await getUserName(attempt.UserId) });

		const calls = [];
		for (const call of lead.calls) calls.push({ ...call, name: await getUserName(call.UserId) });

		const requeues = [];

		for (const requeue of lead.requeues) {
			const supervisorName = requeue.UserId ? await getUserName(requeue.UserId) : undefined;
			const disposition = await prisma.ldRuleDispositionRule
				.findUnique({ where: { id: requeue.dispositionRuleId ?? '' } })
				.catch(prismaErrorHandler);

			requeues.push({
				...requeue,
				supervisorName,
				dispositionNum: disposition?.num
			});
		}

		return { ...lead, attempts, calls, requeues };
	});
