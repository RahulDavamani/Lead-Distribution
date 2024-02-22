import { z } from 'zod';
import { prisma } from '../../../../prisma/prisma';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Affiliate } from '../../../../zod/affiliate.schema';
import { procedure } from '../../../server';
import { roleTypeSchema } from '../../../../stores/auth.store';
import type { Prisma } from '@prisma/client';
import { getUserStr, getUserValues } from '../helpers/user';
import { actionsInclude } from '$lib/config/actions.config';
import { getLeadsWhere } from '../helpers/getLeadsWhere';
import { getProcessName, getProcessNameSplit } from '../helpers/notificationProcess';

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

		let queuedLeads = await Promise.all(
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

							notificationProcesses: {
								orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
								select: {
									createdAt: true,
									status: true,
									callbackNum: true,
									requeueNum: true,
									notificationAttempts: {
										select: {
											id: true,
											UserKey: true,
											attempt: { select: { num: true } }
										},
										orderBy: { createdAt: 'desc' }
									},
									escalations: {
										select: {
											id: true,
											UserKey: true,
											escalation: { select: { num: true } }
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
								where: { type: 'disposition' },
								orderBy: { createdAt: 'desc' },
								take: 1,
								select: { responseValue: true }
							}
						}
					})
					.catch(prismaErrorHandler)
			).map(async (lead) => {
				const notificationProcess = lead.notificationProcesses.length > 0 ? lead.notificationProcesses[0] : undefined;
				return {
					...lead,
					prospectDetails: { ...(await getProspectDetails(lead.ProspectKey)) },
					isNewLead: lead.notificationProcesses.length === 0 || lead.notificationProcesses[0].callbackNum === 0,
					notificationProcess,
					notificationProcessName: getProcessNameSplit(
						notificationProcess?.callbackNum ?? 0,
						notificationProcess?.requeueNum ?? 0
					),
					disposition: lead.responses.length > 0 ? lead.responses[0].responseValue : undefined,
					callUser:
						lead.calls.length > 0
							? {
									...lead.calls[0],
									userStr: lead.calls[0].UserKey ? await getUserStr(lead.calls[0].UserKey) : null
								}
							: undefined
				};
			})
		);

		// Filter Leads
		if (roleType === 'AGENT') {
			const leads = queuedLeads.filter((lead) => lead.id === '');
			for (const lead of queuedLeads) {
				const operator = await prisma.ldRuleOperator.findUnique({
					where: { ruleId_UserKey: { ruleId: lead.ruleId ?? '', UserKey: UserKey } },
					select: { assignNewLeads: true, assignCallbackLeads: true }
				});

				if (operator)
					if ((lead.isNewLead && operator.assignNewLeads) || (!lead.isNewLead && operator.assignCallbackLeads))
						leads.push(lead);
			}
			queuedLeads = leads;
		}

		// Sort Leads
		const newLeads = queuedLeads.filter((lead) => lead.isNewLead);
		const callbackLeads = queuedLeads.filter((lead) => !lead.isNewLead);
		newLeads.sort((a, b) => (a.prospectDetails.ProspectId ?? 0) - (b.prospectDetails.ProspectId ?? 0));
		callbackLeads.sort(
			(a, b) => (b.notificationProcess?.createdAt.getTime() ?? 0) - (a.notificationProcess?.createdAt.getTime() ?? 0)
		);
		queuedLeads = [...newLeads, ...callbackLeads];

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
						include: {
							rule: { select: { name: true } },

							logs: {
								orderBy: { createdAt: 'desc' },
								take: 1,
								select: { log: true }
							}
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
					user: lead.UserKey ? await getUserStr(lead.UserKey) : undefined,
					log: lead.logs[0]?.log
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
						notificationProcesses: {
							orderBy: [{ callbackNum: 'asc' }, { requeueNum: 'asc' }],
							include: {
								notificationAttempts: { orderBy: { createdAt: 'asc' } },
								escalations: { orderBy: { createdAt: 'asc' } }
							}
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
						notificationProcesses: {
							orderBy: { createdAt: 'asc' },
							include: {
								notificationAttempts: { orderBy: { createdAt: 'asc' } },
								escalations: { orderBy: { createdAt: 'asc' } }
							}
						},
						messages: { orderBy: { createdAt: 'asc' } },
						calls: { orderBy: { createdAt: 'asc' } },
						responses: { orderBy: { createdAt: 'asc' }, include: { actions: actionsInclude } }
					}
				})
				.catch(prismaErrorHandler);

		const { ProspectId } = await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey: lead.ProspectKey },
				select: { ProspectId: true }
			})
			.catch(prismaErrorHandler);

		const notificationAttempts = [];
		for (const notificationAttempt of lead.notificationProcesses.flatMap(
			({ notificationAttempts }) => notificationAttempts
		)) {
			notificationAttempts.push({
				...notificationAttempt,
				userValues: notificationAttempt.UserKey ? await getUserValues(notificationAttempt.UserKey) : undefined
			});
		}

		const escalations = [];
		for (const escalation of lead.notificationProcesses.flatMap(({ escalations }) => escalations)) {
			escalations.push({
				...escalation,
				userValues: escalation.UserKey ? await getUserValues(escalation.UserKey) : undefined
			});
		}

		const notificationProcesses = [];
		for (const notificationProcess of lead.notificationProcesses) {
			const notificationAttempts = [];
			for (const notificationAttempt of notificationProcess.notificationAttempts)
				notificationAttempts.push({
					...notificationAttempt,
					userValues: notificationAttempt.UserKey ? await getUserValues(notificationAttempt.UserKey) : undefined
				});

			const escalations = [];
			for (const escalation of notificationProcess.escalations)
				escalations.push({
					...escalation,
					userValues: escalation.UserKey ? await getUserValues(escalation.UserKey) : undefined
				});

			notificationProcesses.push({
				...notificationProcess,
				processName: getProcessName(notificationProcess.callbackNum, notificationProcess.requeueNum),
				notificationAttempts,
				escalations
			});
		}

		const calls = [];
		for (const call of lead.calls)
			calls.push({
				...call,
				userValues: call?.UserKey ? await getUserValues(call.UserKey) : undefined
			});

		return { ...lead, ProspectId, calls, notificationProcesses };
	});
