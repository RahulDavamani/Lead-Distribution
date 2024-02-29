import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { dispatchNotifications } from './dispatchNotifications';
import { sendSMS } from './message';
import { getCompanyKey } from './getCompanyKey';
import { createLeadFunc } from './createLead';

export const insertLead = async (ProspectKey: string) => {
	const createLead = createLeadFunc(ProspectKey);

	// Check if Lead is already in Queue
	const existingLead = await prisma.ldLead
		.findUnique({ where: { ProspectKey }, select: { id: true } })
		.catch(prismaErrorHandler);
	const existingCompletedLead = await prisma.ldLeadCompleted
		.findUnique({ where: { ProspectKey }, select: { id: true } })
		.catch(prismaErrorHandler);
	if (existingLead || existingCompletedLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

	// Get CompanyKey
	const CompanyKey = await getCompanyKey(ProspectKey);
	if (!CompanyKey) {
		await createLead({ log: { log: `Affiliate not found` } });
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
		await createLead({ log: { log: `Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}
	if (!rule.isActive) {
		await createLead({ log: { log: `Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// Create Lead
	await createLead({ ruleId: rule.id, log: { log: 'Lead Queued' } });

	// Send SMS
	await sendSMS(ProspectKey, rule.smsTemplate);

	// Send Notification to Operators
	await dispatchNotifications(ProspectKey, 0, 0);
};
