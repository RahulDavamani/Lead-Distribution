import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { createLead, updateLeadFunc } from './lead.helper';
import { getCompanyKey } from './getCompanyKey';
import { getUserStr } from './user.helper';
import { sendNotifications } from './sendNotifications';
import { generateMessage } from './generateMessage';
import { sendSMS } from './twilio';

export const distributeLead = async (ProspectKey: string) => {
	const updateLead = updateLeadFunc(ProspectKey);

	// Check if Lead is already in Queue
	const existingLead = await prisma.ldLead
		.findFirst({
			where: { ProspectKey },
			select: { id: true }
		})
		.catch(prismaErrorHandler);
	if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

	const queueType = 'NEW LEAD';

	// Get CompanyKey
	const CompanyKey = await getCompanyKey(ProspectKey);
	if (!CompanyKey) {
		await createLead(ProspectKey);
		await updateLead({ log: { log: `${queueType}: Affiliate not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
	}

	// Find Rule for CompanyKey
	const rule = await prisma.ldRule
		.findFirst({
			where: { affiliates: { some: { CompanyKey } } },
			include: {
				notificationAttempts: { orderBy: { num: 'asc' } },
				operators: true,
				supervisors: true
			},
			orderBy: { createdAt: 'desc' }
		})
		.catch(prismaErrorHandler);

	// Rule Not Found / Inactive
	if (!rule) {
		await createLead(ProspectKey);
		await updateLead({ log: { log: `${queueType}: Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}
	if (!rule.isActive) {
		await createLead(ProspectKey);
		await updateLead({ log: { log: `${queueType}: Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// Create Lead
	await createLead(ProspectKey, rule.id);
	await updateLead({ log: { log: 'Lead Queued' } });

	// Send SMS
	const { Phone } = await prisma.leadProspect
		.findFirstOrThrow({ where: { ProspectKey }, select: { Phone: true } })
		.catch(prismaErrorHandler);
	const message = await generateMessage(ProspectKey, rule.smsTemplate);
	await sendSMS(Phone ?? '', message);
	await updateLead({
		log: { log: 'Text message sent to customer (SMS #1)' },
		message: { message }
	});

	// Send Notification to Operators
	await sendNotifications(queueType, ProspectKey, rule);
};

export const redistributeLead = async (ProspectKey: string, UserKey?: string) => {
	const updateLead = updateLeadFunc(ProspectKey);

	// Check if Lead is already in Queue
	const lead = await prisma.ldLead
		.findFirstOrThrow({
			where: { ProspectKey },
			include: {
				rule: {
					include: {
						notificationAttempts: { orderBy: { num: 'asc' } },
						operators: true,
						supervisors: true
					}
				},
				notificationQueues: { select: { id: true, isCompleted: true } }
			}
		})
		.catch(prismaErrorHandler);
	if (lead.notificationQueues.filter(({ isCompleted }) => !isCompleted).length > 0)
		throw new TRPCError({ code: 'CONFLICT', message: 'Lead is busy' });

	const queueNum = lead.notificationQueues.length;
	const queueType = `REQUEUE #${queueNum} (${UserKey ? 'SUPERVISOR' : 'CALLBACK'})`;

	// Create Lead Requeue
	await updateLead({
		log: {
			log: UserKey
				? `${queueType}: Lead requeued by "${await getUserStr(UserKey)}"`
				: `${queueType}: Lead requeued by response action`
		}
	});

	// Rule Not Found / Inactive
	if (!lead.rule) {
		await updateLead({ log: { log: `${queueType}: Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}
	if (!lead.rule.isActive) {
		await updateLead({ log: { log: `${queueType}: Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// Send Notification to Operators
	await sendNotifications(queueType, ProspectKey, lead.rule);
};
