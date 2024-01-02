import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { procedure } from '../../../server';
import { TRPCError } from '@trpc/server';
import { waitFor } from '$lib/waitFor';
import { upsertLead } from '../helpers/upsertLead';
import { sendNotifications } from '../helpers/sendNotifications';
import { generateNotificationMessage } from '../helpers/generateNotificationMessage';
import { getUserId, getUserName } from '../helpers/getUserValues';

export const checkLeadCompleted = async (ProspectKey: string) => {
	return (
		(await prisma.ldLead.findFirst({ where: { ProspectKey }, select: { isCompleted: true } }).catch(prismaErrorHandler))
			?.isCompleted ?? false
	);
};

export const updateGHLContact = async (ProspectKey: string, smsTemplate: string) => {
	const message = await generateNotificationMessage(ProspectKey, smsTemplate);
	const ghlTemplate = {
		customFields: [
			{
				id: 'bundlesmstemplate',
				key: 'bundlesmstemplate',
				field_value: message
			}
		]
	};
	await prisma.$queryRaw`exec [p_GHL_PUTContactUpdate] ${ProspectKey},${ghlTemplate}`.catch(prismaErrorHandler);
};

export const getGHLStatus = async (ProspectKey: string) => {
	try {
		const ghlResponse = (await prisma.$queryRaw`Exec [p_GHL_GetProspect] ${ProspectKey}`.catch(prismaErrorHandler)) as {
			Response?: string;
		}[];
		const ghlData = JSON.parse(ghlResponse?.[0]?.Response ?? 'undefined') as {
			contact?: { customFields?: { id: string; value: string }[] };
		};
		const ghlStatus = ghlData?.contact?.customFields?.find((cf) => cf.id === '5DyNSCM7X3blCAWJSteM')?.value;
		return ghlStatus ?? 'Not Found';
	} catch (error) {
		return 'Not Found';
	}
};

export const distributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey } }) => {
		// Find Prospect
		const { CompanyKey } = await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey },
				select: { CompanyKey: true }
			})
			.catch(prismaErrorHandler);

		// Check if Lead is already in Queue
		const existingLead = await prisma.ldLead
			.findFirst({
				where: { ProspectKey },
				select: { id: true }
			})
			.catch(prismaErrorHandler);
		if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

		// No Company Key in Prospect
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
		const lead = await upsertLead(ProspectKey, 'LEAD QUEUED');

		// Update GHL Contact
		await updateGHLContact(ProspectKey, rule.smsTemplate);

		// Wait for Customer Reply
		await upsertLead(ProspectKey, 'WAITING FOR CUSTOMER REPLY');
		await waitFor(rule.waitTimeForCustomerResponse ?? 0);

		// Get GHL Status
		const ghlStatus = await getGHLStatus(ProspectKey);
		await upsertLead(ProspectKey, `GHL STATUS: ${ghlStatus}`);

		// If Customer Reply, Complete Lead
		if (ghlStatus === 'Text Received') {
			await upsertLead(ProspectKey, 'CUSTOMER REPLIED', false, true);
			return;
		}

		// Check if Lead is already completed
		const isLeadCompleted = await checkLeadCompleted(ProspectKey);
		if (isLeadCompleted) return;

		// Else Send Notification to Operators
		await sendNotifications(ProspectKey, lead.id, rule);

		return { ProspectKey };
	});

export const redistributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey, UserKey } }) => {
		// Find Prospect
		const { CompanyKey } = await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey },
				select: { CompanyKey: true }
			})
			.catch(prismaErrorHandler);

		// Check if Lead is already in Queue
		const lead = await prisma.ldLead.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
		if (lead.isCompleted || lead.isProgress)
			throw new TRPCError({ code: 'CONFLICT', message: 'Lead is Completed or In Progress' });
		const UserId = (await getUserId(UserKey)) as number;

		// No Company Key in Prospect
		if (!CompanyKey) {
			await upsertLead(ProspectKey, 'AFFILIATE NOT FOUND');
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
		}

		// Find Rule for Company
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey } }, isActive: true },
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

		// Create Lead Requeue
		await prisma.ldLeadRequeue.create({ data: { leadId: lead.id, UserId } }).catch(prismaErrorHandler);
		const Name = await getUserName(UserId);
		await upsertLead(ProspectKey, `LEAD REQUEUED BY "${UserId}: ${Name}"`, true);

		// Send Notification to Operators
		await sendNotifications(ProspectKey, lead.id, rule);

		return { ProspectKey };
	});
