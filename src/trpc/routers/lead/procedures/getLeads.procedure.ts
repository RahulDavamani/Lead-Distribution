import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Affiliate } from '../../../../zod/affiliate.schema';
import { procedure } from '../../../server';
import { roleTypeSchema } from '../../../../stores/auth.store';
import type { Prisma } from '@prisma/client';
import { getUserStr, getUserValues } from '../helpers/user.helper';
import { actionsInclude } from '$lib/config/actions.config';
import { getLeadsWhere } from '../helpers/getLeadsWhere';

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

export const getQueuedProcedure = procedure
	.input(z.object({ UserKey: z.string().min(1), roleType: roleTypeSchema }))
	.query(async ({ input: { UserKey, roleType } }) => {
		const where = getLeadsWhere(roleType, UserKey) as Prisma.LdLeadWhereInput;

		const queuedLeads = await Promise.all(
			(
				await prisma.ldLead
					.findMany({
						where,
						include: {
							rule: {
								select: {
									name: true,
									supervisors: {
										where: { UserKey },
										select: { UserKey: true, isRequeue: true }
									}
								}
							},

							logs: {
								orderBy: { createdAt: 'desc' },
								take: 1,
								select: { log: true }
							},

							notificationQueues: {
								orderBy: { updatedAt: 'desc' },
								select: {
									isCompleted: true,
									type: true,
									notificationAttempts: {
										select: {
											id: true,
											UserKey: true,
											attempt: { select: { num: true } }
										},
										orderBy: { createdAt: 'desc' }
									}
								}
							},

							calls: {
								orderBy: { createdAt: 'desc' },
								take: 1,
								select: { UserKey: true }
							},

							responses: {
								where: { type: 'sms' },
								orderBy: { createdAt: 'desc' },
								take: 1,
								select: { responseValue: true }
							}
						}
					})
					.catch(prismaErrorHandler)
			).map(async (lead) => {
				return {
					...lead,
					prospectDetails: { ...(await getProspectDetails(lead.ProspectKey)) },
					log: lead.logs[0].log,
					isNewLead: lead.notificationQueues.length <= 1 && !lead.isPicked,
					isNotificationQueue:
						lead.notificationQueues.length === 0
							? true
							: lead.notificationQueues.filter(({ isCompleted }) => !isCompleted).length > 0,
					latestNotificationQueue: lead.notificationQueues?.[0],
					latestCustomerResponse: lead.responses?.[0]?.responseValue,
					latestCallUser: lead.calls[0]
						? {
								...lead.calls[0],
								userStr: lead.calls[0].UserKey ? await getUserStr(lead.calls[0].UserKey) : null
						  }
						: undefined
				};
			})
		);
		queuedLeads.sort((a, b) => (a.prospectDetails.ProspectId ?? 0) - (b.prospectDetails.ProspectId ?? 0));

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
						include: { rule: { select: { name: true } } }
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
					customerTalkTime
				};
			})
		);
		completedLeads.sort((a, b) => (a.prospectDetails.ProspectId ?? 0) - (b.prospectDetails.ProspectId ?? 0));

		return { completedLeads };
	});

export const getLeadDetailsProcedure = procedure
	.input(z.object({ id: z.string().min(1), type: z.enum(['queued', 'completed']) }))
	.query(async ({ input: { id, type } }) => {
		let lead;
		if (type === 'queued')
			lead = await prisma.ldLead
				.findUniqueOrThrow({
					where: { id },
					select: {
						ProspectKey: true,
						logs: { orderBy: { createdAt: 'asc' } },
						notificationQueues: {
							orderBy: { createdAt: 'asc' },
							include: { notificationAttempts: { orderBy: { createdAt: 'asc' } } }
						},
						messages: { orderBy: { createdAt: 'asc' } },
						calls: { orderBy: { createdAt: 'asc' } },
						responses: { orderBy: { createdAt: 'asc' }, include: { actions: actionsInclude } }
					}
				})
				.catch(prismaErrorHandler);
		else
			lead = await prisma.ldLeadCompleted
				.findUniqueOrThrow({
					where: { id },
					select: {
						ProspectKey: true,
						logs: { orderBy: { createdAt: 'asc' } },
						notificationQueues: {
							orderBy: { createdAt: 'asc' },
							include: { notificationAttempts: { orderBy: { createdAt: 'asc' } } }
						},
						messages: { orderBy: { createdAt: 'asc' } },
						calls: { orderBy: { createdAt: 'asc' } },
						responses: { orderBy: { createdAt: 'asc' }, include: { actions: actionsInclude } }
					}
				})
				.catch(prismaErrorHandler);

		const notificationAttempts = [];
		for (const notificationAttempt of lead.notificationQueues.flatMap(
			({ notificationAttempts }) => notificationAttempts
		)) {
			notificationAttempts.push({
				...notificationAttempt,
				userValues: notificationAttempt.UserKey ? await getUserValues(notificationAttempt.UserKey) : undefined
			});
		}
		const notificationQueues = [];
		for (const notificationQueue of lead.notificationQueues) {
			const notificationAttempts = [];
			for (const notificationAttempt of notificationQueue.notificationAttempts)
				notificationAttempts.push({
					...notificationAttempt,
					userValues: notificationAttempt.UserKey ? await getUserValues(notificationAttempt.UserKey) : undefined
				});

			notificationQueues.push({
				...notificationQueue,
				notificationAttempts
			});
		}

		const calls = [];
		for (const call of lead.calls)
			calls.push({
				...call,
				userValues: call?.UserKey ? await getUserValues(call.UserKey) : undefined
			});

		return { ...lead, calls, notificationQueues };
	});
