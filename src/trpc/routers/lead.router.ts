import { z } from 'zod';
import { procedure, router } from '../server';
import type { Prospect } from '../../zod/prospect.schema';
import type { Affiliate } from '../../zod/affiliate.schema';
import { waitFor } from '$lib/waitFor';
import { TRPCError } from '@trpc/server';
import type { Operator } from '../../zod/operator.schema';
// import { waitFor } from '$lib/waitFor';
// import { waitFor } from '$lib/waitFor';

export const createLead = async (prospectKey: string, status: string) => {
	return await prisma.ldLeadQueue.create({
		data: {
			ProspectKey: prospectKey,
			status
		}
	});
};

export const updateLeadStatus = async (prospectKey: string, status: string) => {
	await prisma.ldLeadQueue.update({
		where: { ProspectKey: prospectKey },
		data: { status }
	});
};

export const checkLeadCompleted = async (id: string) => {
	const lead = await prisma.ldLeadQueue.findFirst({
		where: { id }
	});
	return lead === null;
};

export const completeLead = async (id: string, status: string, UserId?: string) => {
	const { createdAt, ProspectKey } = await prisma.ldLeadQueue.delete({
		where: { id }
	});

	await prisma.ldLeadCompleted.create({
		data: { id, createdAt, ProspectKey, status, UserId }
	});
};

export const leadRouter = router({
	view: procedure.input(z.object({ prospectKey: z.string().min(1) })).query(async ({ input: { prospectKey } }) => {
		const lead = await prisma.ldLeadQueue.findFirstOrThrow({ where: { ProspectKey: prospectKey } });
		const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey: prospectKey } });
		return { lead, prospect };
	}),

	completeLead: procedure
		.input(z.object({ leadId: z.string().min(1), UserId: z.string().min(1) }))
		.query(async ({ input: { leadId, UserId } }) => {
			completeLead(leadId, 'OPERATOR RESPONDED', UserId);
		}),

	getQueueLeads: procedure.query(async () => {
		const queueLeads = await prisma.ldLeadQueue.findMany();
		const leads = [];
		for (const lead of queueLeads) {
			const prospects =
				(await prisma.$queryRaw`select CompanyKey from LeadProspect where ProspectKey=${lead.ProspectKey}`) as Prospect[];
			const affiliates = prospects[0].CompanyKey
				? ((await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${prospects[0].CompanyKey}`) as Affiliate[])
				: undefined;
			const companyName = affiliates?.[0]?.CompanyName;

			const ruleName = (
				await prisma.ldRule.findFirst({
					where: { affiliates: { some: { CompanyKey: prospects[0].CompanyKey ?? '' } } },
					select: { name: true }
				})
			)?.name;
			leads.push({ ...lead, companyName, ruleName });
		}
		return { leads };
	}),

	getCompletedLeads: procedure.query(async () => {
		const completedLeads = await prisma.ldLeadCompleted.findMany();
		const leads = [];
		for (const lead of completedLeads) {
			const prospects =
				(await prisma.$queryRaw`select CompanyKey from LeadProspect where ProspectKey=${lead.ProspectKey}`) as Prospect[];
			const affiliates =
				(await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${prospects[0].CompanyKey}`) as Affiliate[];
			const companyName = affiliates[0].CompanyName;
			const operatorName = (
				(await prisma.$queryRaw`select * from VonageUsers where UserId=${lead?.UserId}`) as Operator[]
			)[0]?.Name;

			const ruleName = (
				await prisma.ldRule.findFirst({
					where: { affiliates: { some: { CompanyKey: prospects[0].CompanyKey ?? '' } } },
					select: { name: true }
				})
			)?.name;
			leads.push({ ...lead, companyName, ruleName, operatorName });
		}
		return { leads };
	}),

	distribute: procedure
		.input(z.object({ prospectKey: z.string().min(1) }))
		.query(async ({ input: { prospectKey } }) => {
			// await prisma.ldLeadCompleted.deleteMany();
			// await prisma.ldLeadQueue.deleteMany();
			// return;

			// Find Prospect
			const prospects =
				(await prisma.$queryRaw`select top 1 * from LeadProspect where ProspectKey=${prospectKey}`) as Prospect[];

			// Prospect not found
			if (prospects.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prospect not found' });
			const prospect = prospects[0];

			// Check if Lead is already in Queue
			const existingLead = await prisma.ldLeadQueue.findFirst({
				where: { ProspectKey: prospectKey }
			});
			if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

			// No Company Key in Prospect
			if (!prospect.CompanyKey) {
				await createLead(prospectKey, 'AFFILIATE NOT FOUND');
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
			}

			// Find Rule for Company
			const rule = await prisma.ldRule.findFirst({
				where: { affiliates: { some: { CompanyKey: prospect.CompanyKey } } },
				include: { notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } }, operators: true }
			});

			// No Rule found
			if (!rule) {
				await createLead(prospectKey, 'RULE NOT FOUND');
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
			}

			// Create Lead
			const lead = await createLead(prospectKey, 'LEAD QUEUED');

			// Update GHL Status

			// Wait for Customer Reply
			updateLeadStatus(prospectKey, 'WAITING FOR CUSTOMER REPLY');
			await waitFor(rule.waitTimeForCustomerResponse ?? 0);

			// Check GHL for Customer Reply
			const customerReplied: boolean = false;
			// If Customer Reply, Complete Lead
			if (customerReplied) {
				completeLead(lead.id, 'CUSTOMER REPLIED');
				return;
			}

			// Else Send Notification to Operator

			if (rule.notification) {
				const availableOperators =
					(await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready' and StatusSince > dateadd(hour,-1,getdate())`) as {
						AgentId: number;
					}[];

				console.log(availableOperators.map(({ AgentId }) => AgentId));

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
						(await prisma.$queryRaw`select * from VonageUsers where UserId=${operator.UserId}`) as Operator[]
					)[0].Name;

					console.log(`SENDING NOTIFICATION: ATTEMPT ${attempt.num} SENT TO OPERATOR ${operatorName}`);
					console.log(operator.UserId, operatorName);
					console.log(`http://localhost:3000/view-lead?prospectKey=${prospectKey}&UserId=${operator.UserId}`);
					updateLeadStatus(
						prospectKey,
						`SENDING NOTIFICATION: ATTEMPT ${attempt.num} SENT TO OPERATOR ${operatorName}`
					);
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
				if (noOperatorFound) updateLeadStatus(prospectKey, `NO OPERATOR FOUND`);
				else updateLeadStatus(prospectKey, `NO RESPONSE FROM OPERATORS`);
			}

			return { prospectKey };
		})
});
