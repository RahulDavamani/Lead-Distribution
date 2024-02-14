import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { upsertLeadFunc } from './lead';
import { getCompanyKey } from './getCompanyKey';
import { getUserStr } from './user';
import { dispatchNotifications } from './dispatchNotifications';
import { generateMessage } from './generateMessage';
import { sendSMS } from './twilio';
import { scheduleJob } from 'node-schedule';

export const distributeLead = async (ProspectKey: string) => {
	const upsertLead = upsertLeadFunc(ProspectKey);

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
	const { Phone } = await prisma.leadProspect
		.findFirstOrThrow({ where: { ProspectKey }, select: { Phone: true } })
		.catch(prismaErrorHandler);
	const message = await generateMessage(ProspectKey, rule.smsTemplate);
	await sendSMS(Phone ?? '', message);
	await upsertLead({
		log: { log: 'SMS #1: Text message sent to customer' },
		message: { message }
	});

	// Send Notification to Operators
	await dispatchNotifications(ProspectKey, 0, 0);
};

export const supervisorRedistribute = async (ProspectKey: string, UserKey: string) => {
	const upsertLead = upsertLeadFunc(ProspectKey);

	// Check if Lead is already in Queue
	const { rule, notificationProcesses } = await prisma.ldLead
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				rule: { select: { id: true, isActive: true } },
				notificationProcesses: {
					orderBy: { createdAt: 'desc' },
					select: { callbackNum: true, requeueNum: true }
				}
			}
		})
		.catch(prismaErrorHandler);

	// Create Lead Requeue
	await upsertLead({ log: { log: `Lead requeued by "${await getUserStr(UserKey)}"` }, isPicked: false });

	// Rule Not Found / Inactive
	if (!rule) {
		await upsertLead({ log: { log: `Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}
	if (!rule.isActive) {
		await upsertLead({ log: { log: `Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// Send Notification to Operators
	await dispatchNotifications(ProspectKey, notificationProcesses[0].callbackNum, notificationProcesses[0].callbackNum);
};

export const callbackRedistribute = async (ProspectKey: string, scheduleTime: number) => {
	const upsertLead = upsertLeadFunc(ProspectKey);
	const scheduledTime = new Date(Date.now() + scheduleTime * 1000);

	const { rule, notificationProcesses } = await prisma.ldLead
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				rule: { select: { id: true, isActive: true } },
				notificationProcesses: {
					orderBy: { createdAt: 'desc' },
					select: { callbackNum: true }
				}
			}
		})
		.catch(prismaErrorHandler);

	const { id } = await prisma.ldLeadNotificationProcess.create({
		data: {
			lead: { connect: { ProspectKey } },
			createdAt: scheduledTime,
			updatedAt: scheduledTime,
			callbackNum: notificationProcesses[0].callbackNum + 1,
			requeueNum: 0,
			status: 'SCHEDULED'
		},
		select: { id: true }
	});

	await upsertLead({ isPicked: false });

	// Schedule Requeue Lead
	scheduleJob(scheduledTime, async () => {
		const process = await prisma.ldLeadNotificationProcess
			.findUniqueOrThrow({ where: { id }, select: { status: true } })
			.catch(prismaErrorHandler);
		if (process.status !== 'SCHEDULED') return;

		// Create Lead Requeue
		await upsertLead({ log: { log: `Lead requeued by callback` } });

		// Rule Not Found / Inactive
		if (!rule) {
			await upsertLead({ log: { log: `Rule not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}
		if (!rule.isActive) {
			await upsertLead({ log: { log: `Rule is inactive` } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Send Notification to Operators
		await dispatchNotifications(ProspectKey, notificationProcesses[0].callbackNum + 1, 0);
	});
};
