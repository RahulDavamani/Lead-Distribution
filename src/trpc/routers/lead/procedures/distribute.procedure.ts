import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { procedure } from '../../../server';
import { TRPCError } from '@trpc/server';
import { waitFor } from '$lib/waitFor';
import { upsertLead } from '../helpers/upsertLead';
import { getOperatorName } from '../helpers/getOperatorName';
import { getUserId } from '../helpers/getUserId';
import { sendNotifications } from '../helpers/sendNotifications';

export const checkLeadCompleted = async (ProspectKey: string) => {
	return (
		(await prisma.ldLead.findFirst({ where: { ProspectKey }, select: { isCompleted: true } }).catch(prismaErrorHandler))
			?.isCompleted ?? false
	);
};

export const getGHLStatus = async (ProspectKey: string) => {
	const ghlResponse = (await prisma.$queryRaw`Exec [p_GHL_GetProspect] ${ProspectKey}`.catch(prismaErrorHandler)) as {
		Response?: string;
	}[];
	const ghlData = JSON.parse(ghlResponse?.[0]?.Response ?? 'undefined') as {
		contact?: { customFields?: { id: string; value: string }[] };
	};
	const ghlStatus = ghlData?.contact?.customFields?.find((cf) => cf.id === '5DyNSCM7X3blCAWJSteM')?.value;
	return ghlStatus ?? 'GHL STATUS: Not Found';
};

export const distributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey } }) => {
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
		sendNotifications(ProspectKey, lead.id, rule);

		return { ProspectKey };
	});

export const redistributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey, UserKey } }) => {
		// Find Prospect
		const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
		const lead = await prisma.ldLead.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
		if (lead.isCompleted || lead.isProgress)
			throw new TRPCError({ code: 'CONFLICT', message: 'Lead is Completed or In Progress' });
		const UserId = (await getUserId(UserKey)) as number;

		// Find Rule for Company
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey: prospect.CompanyKey ?? '' } } },
				include: { notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } }, operators: true }
			})
			.catch(prismaErrorHandler);

		// No Rule found
		if (!rule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });

		// Create Lead Requeue
		await prisma.ldLeadRequeue.create({ data: { leadId: lead.id, UserId } }).catch(prismaErrorHandler);
		const Name = await getOperatorName(UserId);
		await upsertLead(ProspectKey, `LEAD REQUEUED BY "${UserId}: ${Name}"`, true);

		// Send Notification to Operators
		sendNotifications(ProspectKey, lead.id, rule);

		return { ProspectKey };
	});
