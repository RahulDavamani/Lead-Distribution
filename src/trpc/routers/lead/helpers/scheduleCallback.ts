import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { updateLeadFunc } from './updateLead';
import { dispatchNotifications } from './dispatchNotifications';
import { scheduleJob } from 'node-schedule';
import { endNotificationProcesses } from './notificationProcess';
import { sendSMS } from './message';
import { waitFor } from '$lib/waitFor';

export const scheduleCallback = async (
	ProspectKey: string,
	scheduledTime: Date,
	sms: { smsTemplate: string; smsWaitTime: number } | undefined
) => {
	const updateLead = updateLeadFunc(ProspectKey);
	// Get Lead
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

	// End Notification Processes
	await endNotificationProcesses(ProspectKey);
	await updateLead({ isPicked: false });

	// Create Lead Notification Process
	const callbackNum = notificationProcesses[0].callbackNum + 1;
	const { id } = await prisma.ldLeadNotificationProcess.create({
		data: {
			lead: { connect: { ProspectKey } },
			createdAt: scheduledTime,
			updatedAt: scheduledTime,
			callbackNum,
			requeueNum: 0,
			status: 'SCHEDULED'
		},
		select: { id: true }
	});

	// Schedule Requeue Lead
	scheduleJob(scheduledTime, async () => {
		const process = await prisma.ldLeadNotificationProcess
			.findUniqueOrThrow({ where: { id }, select: { status: true } })
			.catch(prismaErrorHandler);
		if (process.status !== 'SCHEDULED') return;

		// Lead Requeue
		await updateLead({ log: { log: `Lead requeued by Callback #${callbackNum}` } });

		// Send SMS
		if (sms) {
			await sendSMS(ProspectKey, sms.smsTemplate);
			await waitFor(sms.smsWaitTime);
		}

		// Rule Not Found / Inactive
		if (!rule) {
			await updateLead({ log: { log: `Rule not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}
		if (!rule.isActive) {
			await updateLead({ log: { log: `Rule is inactive` } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Send Notification to Operators
		await dispatchNotifications(ProspectKey, callbackNum, 0);
	});
};
