import { z } from 'zod';
import { procedure, router } from '../server';
import type { Prospect } from '../../zod/prospect.schema';
import type { Affiliate } from '../../zod/affiliate.schema';
import { waitFor } from '$lib/waitFor';
// import { waitFor } from '$lib/waitFor';
// import { waitFor } from '$lib/waitFor';

export const createLead = async (prospectKey: string) => {
	return await prisma.ldLeadQueue.create({
		data: {
			ProspectKey: prospectKey,
			status: 'LEAD QUEUED'
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

export const completeLead = async (id: string, status: string) => {
	const { createdAt, ProspectKey } = await prisma.ldLeadQueue.delete({
		where: { id }
	});

	await prisma.ldLeadCompleted.create({
		data: { id, createdAt, ProspectKey, status }
	});
};

export const leadRouter = router({
	getQueueLeads: procedure.query(async () => {
		const queueLeads = await prisma.ldLeadQueue.findMany();
		const leads = [];
		for (const lead of queueLeads) {
			const prospects =
				(await prisma.$queryRaw`select CompanyKey from LeadProspect where ProspectKey=${lead.ProspectKey}`) as Prospect[];
			const affiliates =
				(await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${prospects[0].CompanyKey}`) as Affiliate[];
			const companyName = affiliates[0].CompanyName;

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

	distribute: procedure
		.input(z.object({ prospectKey: z.string().min(1) }))
		.query(async ({ input: { prospectKey } }) => {
			// await prisma.ldLeadCompleted.deleteMany();
			// await prisma.ldLeadQueue.deleteMany();
			// return;

			// Find Prospect
			const prospects =
				(await prisma.$queryRaw`select top 10 * from LeadProspect where ProspectKey=${prospectKey}`) as Prospect[];

			// Prospect not found
			if (prospects.length === 0) return;
			const prospect = prospects[0];

			// Check if Lead is already in Queue
			const existingLead = await prisma.ldLeadQueue.findFirst({
				where: { ProspectKey: prospectKey }
			});
			if (existingLead) return;

			// No Company Key in Prospect
			if (!prospect.CompanyKey) return;

			// Find Rule for Company
			const rule = await prisma.ldRule.findFirst({
				where: { affiliates: { some: { CompanyKey: prospect.CompanyKey } } },
				include: { notification: { include: { notificationAttempts: true } }, operators: true }
			});

			// No Rule found
			if (!rule) return;

			// Create Lead
			const lead = await createLead(prospectKey);

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

				const completedAttempts: { attemptId: string; UserId: number }[] = [];

				for (const attempt of rule.notification.notificationAttempts) {
					const operator = rule.operators.find(
						({ UserId }) =>
							availableOperators.map(({ AgentId }) => AgentId).includes(UserId) &&
							!completedAttempts.map(({ UserId }) => UserId).includes(UserId)
					);
					// No Operator Found
					if (!operator) break;

					console.log(`Sending Notification Attempt ${attempt.num} to `, operator.UserId);
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
			}

			return { prospectKey };
		})
});
