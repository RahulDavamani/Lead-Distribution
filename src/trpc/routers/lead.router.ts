import { z } from 'zod';
import { procedure, router } from '../server';
import type { Prospect } from '../../zod/prospect.schema';
import type { Affiliate } from '../../zod/affiliate.schema';
import { waitFor } from '$lib/waitFor';
import { TRPCError } from '@trpc/server';
import type { Operator } from '../../zod/operator.schema';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';

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

	await prisma.ldLeadHistory.create({ data: { leadId: lead.id, status } }).catch(prismaErrorHandler);
	return lead;
};

export const checkLeadCompleted = async (ProspectKey: string) => {
	return (
		(await prisma.ldLead.findFirst({ where: { ProspectKey }, select: { isCompleted: true } }).catch(prismaErrorHandler))
			?.isCompleted ?? false
	);
};

export const leadRouter = router({
	view: procedure.input(z.object({ prospectKey: z.string().min(1) })).query(async ({ input: { prospectKey } }) => {
		const lead = await prisma.ldLead
			.findFirstOrThrow({ where: { ProspectKey: prospectKey } })
			.catch(prismaErrorHandler);

		const prospect = await prisma.leadProspect
			.findFirstOrThrow({ where: { ProspectKey: prospectKey } })
			.catch(prismaErrorHandler);
		return { lead, prospect };
	}),

	complete: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserId: z.number().min(1) }))
		.query(async ({ input: { ProspectKey, UserId } }) => {
			await upsertLead(ProspectKey, 'OPERATOR RESPONDED', true, UserId);
		}),

	getAll: procedure.query(async () => {
		const ldLeads = await prisma.ldLead.findMany();
		const leads = [];
		for (const lead of ldLeads) {
			const prospect = await prisma.leadProspect
				.findFirstOrThrow({ where: { ProspectKey: lead.ProspectKey } })
				.catch(prismaErrorHandler);
			const affiliates = prospect.CompanyKey
				? ((await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${prospect.CompanyKey}`.catch(
						prismaErrorHandler
				  )) as Affiliate[])
				: undefined;
			const companyName = affiliates?.[0]?.CompanyName ?? 'N/A';
			const operatorName =
				(
					(await prisma.$queryRaw`select * from VonageUsers where UserId=${lead?.UserId}`.catch(
						prismaErrorHandler
					)) as Operator[]
				)[0]?.Name ?? 'N/A';

			const ruleName =
				(
					await prisma.ldRule
						.findFirst({
							where: { affiliates: { some: { CompanyKey: prospect.CompanyKey ?? '' } } },
							select: { name: true }
						})
						.catch(prismaErrorHandler)
				)?.name ?? 'N/A';
			leads.push({ ...lead, companyName, ruleName, operatorName });
		}
		return { queuedLeads: leads.filter((l) => !l.isCompleted), completedLeads: leads.filter((l) => l.isCompleted) };
	}),

	distribute: procedure
		.input(z.object({ ProspectKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey } }) => {
			// await prisma.ldLead.deleteMany();
			// return;

			// Find Prospect
			const prospects =
				(await prisma.$queryRaw`select top 1 * from LeadProspect where ProspectKey=${ProspectKey}`.catch(
					prismaErrorHandler
				)) as Prospect[];

			// Prospect not found
			if (prospects.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prospect not found' });
			const prospect = prospects[0];

			// Check if Lead is already in Queue
			const existingLead = await prisma.ldLead
				.findFirst({
					where: { ProspectKey: ProspectKey }
				})
				.catch(prismaErrorHandler);
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
				const availableOperators =
					(await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready' and StatusSince > dateadd(hour,-1,getdate())`.catch(
						prismaErrorHandler
					)) as {
						AgentId: number;
					}[];

				const completedAttempts: { attemptId: string; UserId: number }[] = [];

				let noOperatorFound = false;
				for (const attempt of rule.notification.notificationAttempts) {
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
					const operatorName = (
						(await prisma.$queryRaw`select * from VonageUsers where UserId=${operator.UserId}`.catch(
							prismaErrorHandler
						)) as Operator[]
					)[0].Name;

					console.log(`SENDING NOTIFICATION: ATTEMPT ${attempt.num} SENT TO OPERATOR ${operatorName}`);
					console.log(operator.UserId, operatorName);
					console.log(`http://localhost:3000/view-lead?prospectKey=${ProspectKey}&UserId=${operator.UserId}`);
					upsertLead(ProspectKey, `SENDING NOTIFICATION: ATTEMPT ${attempt.num} SENT TO OPERATOR ${operatorName}`);
					// await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
					//    @Title = 'Lead Received',
					//    @Message = ${attempt.textTemplate},
					//    @UserKeys = ${operator.UserId},
					//    @ExpireInSeconds = 600,
					//    @HrefURL = ${`http://localhost:3000/view-lead?prospectKey=${prospectKey}&UserId=${operator.UserId}`},
					//    @ActionBtnTitle = 'View Lead';`;
					completedAttempts.push({ attemptId: attempt.id, UserId: operator.UserId });
					await waitFor(attempt.waitTime);

					const isLeadCompleted = await checkLeadCompleted(lead.id);
					if (isLeadCompleted) break;
				}
				if (noOperatorFound) upsertLead(ProspectKey, `NO OPERATOR FOUND`);
				else upsertLead(ProspectKey, `NO RESPONSE FROM OPERATORS`);
			}

			return { ProspectKey };
		})
});
