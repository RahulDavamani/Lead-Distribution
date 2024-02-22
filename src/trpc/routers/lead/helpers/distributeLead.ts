import { prisma } from '../../../../prisma/prisma';
import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { unCompleteLead, upsertLeadFunc } from './lead';
import { getCompanyKey } from './getCompanyKey';
import { getUserStr } from './user';
import { dispatchNotifications } from './dispatchNotifications';
import { scheduleJob } from 'node-schedule';
import { sendSMS, watchGhlSMS } from './message';
import { endNotificationProcesses } from './notificationProcess';

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

	// Watch SMS
	if (rule.messagingService === 'ghl') watchGhlSMS(ProspectKey);

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
					orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
					take: 1,
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
	await dispatchNotifications(
		ProspectKey,
		notificationProcesses[0].callbackNum,
		notificationProcesses[0].requeueNum + 1
	);
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
					orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
					take: 1,
					select: { id: true, status: true, callbackNum: true }
				}
			}
		})
		.catch(prismaErrorHandler);

	await endNotificationProcesses(ProspectKey);
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

export const completedRedistribute = async (ProspectKey: string) => {
	const upsertLead = upsertLeadFunc(ProspectKey);
	await unCompleteLead(ProspectKey);

	const { rule, notificationProcesses } = await prisma.ldLead
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				rule: { select: { id: true, isActive: true } },
				notificationProcesses: {
					orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
					take: 1,
					select: { callbackNum: true, requeueNum: true }
				}
			}
		})
		.catch(prismaErrorHandler);

	await upsertLead({ log: { log: `Lead requeued from GHL` } });

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
	await dispatchNotifications(
		ProspectKey,
		notificationProcesses[0].callbackNum,
		notificationProcesses[0].requeueNum + 1
	);
};
