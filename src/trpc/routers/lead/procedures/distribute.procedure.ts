import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { procedure } from '../../../server';
import { TRPCError } from '@trpc/server';
import { waitFor } from '$lib/waitFor';
import { upsertLead } from '../helpers/upsertLead';
import { sendNotifications } from '../helpers/sendNotifications';
import { getUserId, getUserName } from '../helpers/getUserValues';
import { getCompanyKey } from '../helpers/getCompanyKey';
import { getGHLStatus, updateGHLSmsTemplate } from '../helpers/ghl';

export const checkLeadDistributeCompleted = async (ProspectKey: string) => {
	return !(
		(
			await prisma.ldLead
				.findFirst({ where: { ProspectKey }, select: { isDistribute: true } })
				.catch(prismaErrorHandler)
		)?.isDistribute ?? false
	);
};

export const distributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey } }) => {
		// Check if Lead is already in Queue
		const existingLead = await prisma.ldLead
			.findFirst({
				where: { ProspectKey },
				select: { id: true }
			})
			.catch(prismaErrorHandler);
		if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

		// Get CompanyKey
		const CompanyKey = await getCompanyKey(ProspectKey);
		if (!CompanyKey) {
			await upsertLead(ProspectKey, 'AFFILIATE NOT FOUND');
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
		}

		// Find Rule for CompanyKey
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey } } },
				include: { notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } }, operators: true }
			})
			.catch(prismaErrorHandler);

		// Rule Not Found / Inactive
		if (!rule) {
			await upsertLead(ProspectKey, 'RULE NOT FOUND');
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}
		if (!rule.isActive) {
			await upsertLead(ProspectKey, 'RULE IS INACTIVE');
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Create Lead
		const lead = await upsertLead(ProspectKey, 'LEAD QUEUED', { isDistribute: true });

		// Update GHL SMS Template
		await updateGHLSmsTemplate(ProspectKey, rule.smsTemplate);

		// Wait for Customer Reply
		await upsertLead(ProspectKey, 'WAITING FOR CUSTOMER REPLY');
		await waitFor(rule.waitTimeForCustomerResponse ?? 0);

		// Check if Lead is already completed
		let isLeadCompleted = await checkLeadDistributeCompleted(ProspectKey);
		if (isLeadCompleted) return;

		// Get GHL Status
		const ghlStatus = await getGHLStatus(ProspectKey);
		await upsertLead(ProspectKey, `GHL STATUS: ${ghlStatus}`);

		// If Customer Reply, Complete Lead
		if (ghlStatus === 'Text Received') {
			await upsertLead(ProspectKey, 'LEAD COMPLETED: CUSTOMER REPLIED', { isDistribute: false, isCompleted: true });
			return;
		}

		// Check if Lead is already completed
		isLeadCompleted = await checkLeadDistributeCompleted(ProspectKey);
		if (isLeadCompleted) return;

		// Else Send Notification to Operators
		await sendNotifications(ProspectKey, lead.id, rule);

		return { ProspectKey };
	});

export const redistributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey, UserKey } }) => {
		// Check if Lead is already in Queue
		const lead = await prisma.ldLead.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
		if (lead.isCompleted || lead.isDistribute || lead.isCall)
			throw new TRPCError({ code: 'CONFLICT', message: 'Lead is Completed or In Progress' });

		// Create Lead Requeue
		const UserId = (await getUserId(UserKey)) as number;
		await prisma.ldLeadRequeue.create({ data: { leadId: lead.id, UserId } }).catch(prismaErrorHandler);
		const Name = await getUserName(UserId);
		await upsertLead(ProspectKey, `LEAD REQUEUED BY "${UserId}: ${Name}"`, { isDistribute: true });

		// Get CompanyKey
		const CompanyKey = await getCompanyKey(ProspectKey);
		if (!CompanyKey) {
			await upsertLead(ProspectKey, 'AFFILIATE NOT FOUND', { isDistribute: false });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
		}

		// Find Rule for Company
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey } } },
				include: { notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } }, operators: true }
			})
			.catch(prismaErrorHandler);

		// Rule Not Found / Inactive
		if (!rule) {
			await upsertLead(ProspectKey, 'RULE NOT FOUND', { isDistribute: false });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}
		if (!rule.isActive) {
			await upsertLead(ProspectKey, 'RULE IS INACTIVE', { isDistribute: false });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Send Notification to Operators
		await sendNotifications(ProspectKey, lead.id, rule);

		return { ProspectKey };
	});
