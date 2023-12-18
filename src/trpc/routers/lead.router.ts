import { z } from 'zod';
import { procedure, router } from '../server';
import type { Affiliate } from '../../zod/affiliate.schema';
import { waitFor } from '$lib/waitFor';
import { TRPCError } from '@trpc/server';
import type { Operator } from '../../zod/operator.schema';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';
import type { Rule } from '../../zod/rule.schema';
import { env } from '$env/dynamic/private';

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
					where: { affiliates: { some: { CompanyKey: affiliates[0]?.CompanyKey } } },
					include: { notification: true, operators: true }
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
		ruleName: rule?.name ?? 'N/A',
		ruleUserId: rule?.notification?.supervisorUserId ?? rule?.operators[0]?.UserId
	};
};

export const upsertLead = async (
	ProspectKey: string,
	status: string,
	isCompleted: boolean = false,
	UserId?: number
) => {
	const lead = await prisma.ldLead
		.upsert({
			where: { ProspectKey },
			create: { ProspectKey, status, isCompleted, UserId },
			update: { ProspectKey, status, isCompleted, UserId }
		})
		.catch(prismaErrorHandler);

	await prisma.$queryRaw`exec [p_GHL_UpdateProspectContact] ${ProspectKey},3,${status}`;
	await prisma.ldLeadHistory.create({ data: { leadId: lead.id, status } }).catch(prismaErrorHandler);
	return lead;
};

export const checkLeadCompleted = async (ProspectKey: string) => {
	return (
		(await prisma.ldLead.findFirst({ where: { ProspectKey }, select: { isCompleted: true } }).catch(prismaErrorHandler))
			?.isCompleted ?? false
	);
};

export const sendNotification = async (
	ProspectKey: string,
	leadId: string,
	operator: Rule['operators'][number],
	attempt: NonNullable<Rule['notification']>['notificationAttempts'][number]
) => {
	const operatorName = (
		(await prisma.$queryRaw`select * from VonageUsers where UserId=${operator.UserId}`.catch(
			prismaErrorHandler
		)) as Operator[]
	)[0].Name;
	console.log(`SENDING NOTIFICATION: ATTEMPT ${attempt.num} SENT TO OPERATOR ${operatorName}`);
	console.log(`${operator.UserId} - ${operatorName}`);
	console.log(`${env.BASE_URL}/view-lead?ProspectKey=${ProspectKey}&UserId=${operator.UserId}`);

	upsertLead(
		ProspectKey,
		`SENDING NOTIFICATION: ATTEMPT ${attempt.num} SENT TO OPERATOR "${operator.UserId}: ${operatorName}"`
	);

	const UserKey = (
		await prisma.users
			.findFirst({
				where: { VonageAgentId: operator.UserId.toString(), UserStatusKey: 'B9F64623-3943-425D-94C0-127E9E8EBD00' },
				select: { UserKey: true }
			})
			.catch(prismaErrorHandler)
	)?.UserKey;

	console.log(`EXEC [dbo].[p_PA_SendPushAlert]
   @Title = 'Lead Received',
   @Message = ${attempt.textTemplate},
   @UserKeys = ${UserKey},
   @ExpireInSeconds = 600,
   @HrefURL = ${`${env.BASE_URL}/view-lead?ProspectKey=${ProspectKey}&UserId=${operator.UserId}`},
   @ActionBtnTitle = 'View Lead';`);

	await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
	   @Title = 'Lead Received',
	   @Message = ${attempt.textTemplate},
	   @UserKeys = ${UserKey},
	   @ExpireInSeconds = 600,
	   @HrefURL = ${`${env.BASE_URL}/view-lead?ProspectKey=${ProspectKey}&UserId=${operator.UserId}`},
	   @ActionBtnTitle = 'View Lead';`.catch(prismaErrorHandler);

	await prisma.ldLeadAttempts
		.create({
			data: {
				leadId,
				attemptId: attempt.id ?? '',
				UserId: operator.UserId
			}
		})
		.catch(prismaErrorHandler);
};

export const leadRouter = router({
	view: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1).optional() }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const UserId = UserKey
				? Number(
						(
							await prisma.users
								.findFirst({ where: { UserKey }, select: { VonageAgentId: true } })
								.catch(prismaErrorHandler)
						)?.VonageAgentId
				  )
				: undefined;

			const lead = await prisma.ldLead
				.findFirst({
					where: {
						ProspectKey,
						isCompleted: false,
						attempts: UserId ? { some: { UserId } } : undefined
					}
				})
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
			return { UserId, lead, prospect };
		}),

	complete: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserId: z.number().min(1) }))
		.query(async ({ input: { ProspectKey, UserId } }) => {
			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
			if (!prospect) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prospect not found' });
			const outBoundCall = (
				await prisma.ldRule
					.findFirstOrThrow({
						where: { affiliates: { some: { CompanyKey: prospect.CompanyKey ?? '' } } },
						select: { outBoundCall: true }
					})
					.catch(prismaErrorHandler)
			).outBoundCall;

			await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${UserId},${outBoundCall}`.catch(
				prismaErrorHandler
			);
			await upsertLead(ProspectKey, 'LEAD RESPONDED', true, UserId);
			return { ProspectKey };
		}),

	close: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserId: z.number().min(1) }))
		.query(async ({ input: { ProspectKey, UserId } }) => {
			await upsertLead(ProspectKey, 'LEAD CLOSED', true, UserId);
			return { ProspectKey };
		}),

	getQueued: procedure
		.input(z.object({ UserKey: z.string().min(1).optional() }))
		.query(async ({ input: { UserKey } }) => {
			const UserId = UserKey
				? Number(
						(
							await prisma.users
								.findFirst({ where: { UserKey }, select: { VonageAgentId: true } })
								.catch(prismaErrorHandler)
						)?.VonageAgentId
				  )
				: undefined;

			const queuedLeads = (
				await Promise.all(
					(
						await prisma.ldLead.findMany({
							where: { isCompleted: false, attempts: UserId ? { some: { UserId } } : undefined },
							include: { history: { orderBy: { createdAt: 'asc' } } }
						})
					).map(async (lead) => {
						const leadDetails = await getLeadDetails(lead.ProspectKey, lead.UserId);
						return { ...lead, ...leadDetails };
					})
				)
			).sort((a, b) => (a.ProspectId ?? 0) - (b.ProspectId ?? 0));

			return { queuedLeads };
		}),

	getCompleted: procedure
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

			const UserId = UserKey
				? Number(
						(
							await prisma.users
								.findFirst({ where: { UserKey }, select: { VonageAgentId: true } })
								.catch(prismaErrorHandler)
						)?.VonageAgentId
				  )
				: undefined;

			const completedLeads = (
				await Promise.all(
					(
						await prisma.ldLead.findMany({
							where: {
								isCompleted: true,
								updatedAt: { gte: startDate, lte: endDate },
								UserId
							},
							include: { history: { orderBy: { createdAt: 'asc' } } }
						})
					).map(async (lead) => {
						const leadDetails = await getLeadDetails(lead.ProspectKey, lead.UserId);
						return { ...lead, ...leadDetails };
					})
				)
			).sort((a, b) => (a.ProspectId ?? 0) - (b.ProspectId ?? 0));

			return { completedLeads };
		}),

	distribute: procedure
		.input(z.object({ ProspectKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey } }) => {
			// await prisma.ldLead.deleteMany({ where: { ProspectKey: 'c26bba4f-8944-40fc-bb28-c112f4cd4059' } });
			// return;

			// Find Prospect
			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);

			// Check if Lead is already in Queue
			const existingLead = await prisma.ldLead.findFirst({ where: { ProspectKey } }).catch(prismaErrorHandler);
			if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

			// No Company Key in Prospect
			if (!prospect.CompanyKey) {
				await upsertLead(ProspectKey, 'AFFILIATE NOT FOUND');
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
			}

			// Find Rule for Company
			const rule = await prisma.ldRule
				.findFirst({
					where: { affiliates: { some: { CompanyKey: prospect.CompanyKey } } },
					include: { notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } }, operators: true }
				})
				.catch(prismaErrorHandler);

			// No Rule found
			if (!rule) {
				await upsertLead(ProspectKey, 'RULE NOT FOUND');
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
			}

			// Create Lead
			const lead = await upsertLead(ProspectKey, 'LEAD QUEUED');

			// Update GHL Status

			// Wait for Customer Reply
			upsertLead(ProspectKey, 'WAITING FOR CUSTOMER REPLY');
			await waitFor(rule.waitTimeForCustomerResponse ?? 0);

			// Check GHL for Customer Reply
			const customerReplied: boolean = false;
			// If Customer Reply, Complete Lead
			if (customerReplied) {
				upsertLead(lead.id, 'CUSTOMER REPLIED', true);
				return;
			}

			// Else Send Notification to Operator

			if (rule.notification) {
				const { notificationAttempts, supervisorUserId, supervisorTextTemplate } = rule.notification;
				await prisma.$queryRaw`EXEC [p_GetVonageAgentStatus]`.catch(prismaErrorHandler);
				const availableOperators =
					(await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready' and StatusSince > dateadd(hour,-1,getdate())`.catch(
						prismaErrorHandler
					)) as {
						AgentId: number;
					}[];

				const completedAttempts: { attemptId: string; UserId: number }[] = [];

				let noOperatorFound = false;
				for (const attempt of notificationAttempts) {
					const operator = rule.operators.find(
						({ UserId }) =>
							availableOperators.map(({ AgentId }) => AgentId).includes(UserId) &&
							!completedAttempts.map(({ UserId }) => UserId).includes(UserId)
					);
					// No Operator Found
					if (!operator) {
						noOperatorFound = attempt.num === 1;
						break;
					}

					await sendNotification(ProspectKey, lead.id, operator, attempt);
					completedAttempts.push({ attemptId: attempt.id, UserId: operator.UserId });
					await waitFor(attempt.waitTime);

					const isLeadCompleted = await checkLeadCompleted(lead.id);
					if (isLeadCompleted) break;
				}
				if (noOperatorFound) upsertLead(ProspectKey, `NO OPERATOR FOUND`);
				else upsertLead(ProspectKey, `NO RESPONSE FROM OPERATORS`);

				const isLeadCompleted = await checkLeadCompleted(lead.id);
				if (!isLeadCompleted && supervisorUserId) {
					// Send Notification to Supervisor
					const UserKey = (
						await prisma.users
							.findFirst({
								where: {
									VonageAgentId: supervisorUserId.toString(),
									UserStatusKey: 'B9F64623-3943-425D-94C0-127E9E8EBD00'
								},
								select: { UserKey: true }
							})
							.catch(prismaErrorHandler)
					)?.UserKey;

					await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
					   @Title = 'Lead Received',
					   @Message = ${supervisorTextTemplate},
					   @UserKeys = ${UserKey},
					   @ExpireInSeconds = 600,
					   @HrefURL = ${`${env.BASE_URL}/view-lead?ProspectKey=${ProspectKey}&UserId=${supervisorUserId}`},
					   @ActionBtnTitle = 'View Lead';`.catch(prismaErrorHandler);
					upsertLead(ProspectKey, `LEAD ESCALATED TO SUPERVISOR`);
				}
			}

			return { ProspectKey };
		})
});
