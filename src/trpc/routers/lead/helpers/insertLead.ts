import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { upsertLeadFunc } from './upsertLead';
import { dispatchNotifications } from './dispatchNotifications';
import { sendSMS } from './message';
import { getCompanyKey } from './getCompanyKey';

export const insertLead = async (ProspectKey: string) => {
	const upsertLead = upsertLeadFunc(ProspectKey);

	// Check if Lead is already in Queue
	const existingLead = await prisma.ldLead
		.findFirst({ where: { ProspectKey }, select: { id: true } })
		.catch(prismaErrorHandler);
	if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

	// Get CompanyKey
	const CompanyKey = await getCompanyKey(ProspectKey);
	if (!CompanyKey) {
		await upsertLead({ log: { log: `Affiliate not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
	}

	// Find Rule for CompanyKey
	const rule = await prisma.ldRule
		.findFirst({
			where: { affiliates: { some: { CompanyKey } } },
			select: {
				id: true,
				isActive: true,
				messagingService: true,
				smsTemplate: true
			},
			orderBy: { createdAt: 'desc' }
		})
		.catch(prismaErrorHandler);

	// Rule Not Found / Inactive
	if (!rule) {
		await upsertLead({ log: { log: `Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}
	if (!rule.isActive) {
		await upsertLead({ log: { log: `Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// Create Lead
	await upsertLead({ ruleId: rule.id, log: { log: 'Lead Queued' } });

	// Send SMS
	await sendSMS(ProspectKey, rule.smsTemplate);

	// Send Notification to Operators
	await dispatchNotifications(ProspectKey, 0, 0);
};
