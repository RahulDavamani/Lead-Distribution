import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { updateLeadFunc } from './updateLead';
import { dispatchNotifications } from './dispatchNotifications';
import { scheduleJob } from 'node-schedule';
import { endNotificationProcesses } from './notificationProcess';
import { sendSMS } from './message';
import { waitFor } from '$lib/waitFor';
import { calculateLeadDuration, timeToText } from '$lib/client/DateTime';
import moment from 'moment-timezone';

export const scheduleCallback = async (
	ProspectKey: string,
	scheduledTime: Date,
	sms: { smsTemplate: string; smsWaitTime: number } | undefined,
	defaultCallbackNum = 0
) => {
	const updateLead = updateLeadFunc(ProspectKey);
	// Get Lead
	const { rule, CompanyKey, notificationProcesses } = await prisma.ldLead
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				rule: { select: { id: true, isActive: true } },
				CompanyKey: true,
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
	const callbackNum =
		notificationProcesses.length === 0 ? defaultCallbackNum : notificationProcesses[0].callbackNum + 1;
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

	const callbackRequeue = async () => {
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
	};

	const callbackErrorFn = async () => {
		await updateLead({ log: { log: `Callback #${callbackNum}: Cancelled due to internal error` } });
		await prisma.ldLeadNotificationProcess.update({
			where: { id },
			data: { status: 'CANCELLED' }
		});

		if (!rule?.id || !CompanyKey) return;
		const ruleCompany = await prisma.ldRuleCompany.findFirstOrThrow({
			where: { ruleId: rule.id, CompanyKey },
			select: {
				ruleId: true,
				CompanyKey: true,
				timezone: true,
				workingHours: {
					select: {
						id: true,
						start: true,
						end: true,
						days: true
					}
				}
			}
		});

		let rescheduleTime = new Date(Date.now() + 1000);
		const leadDuration = calculateLeadDuration(rescheduleTime, new Date(rescheduleTime.getTime() + 5000), ruleCompany);
		if (leadDuration > 0) {
			await updateLead({ log: { log: `Callback #${callbackNum}: Retry Initiated` } });
			rescheduleTime = new Date(Date.now() + 1000);
		} else {
			rescheduleTime = moment
				.tz(rescheduleTime, 'America/Los_Angeles')
				.add(1, 'day')
				.set({ hour: 9, minute: 0, second: 0 })
				.toDate();

			const diff = rescheduleTime.getTime() - Date.now();
			await updateLead({ log: { log: `Callback #${callbackNum}: Retry Initiated in ${timeToText(diff)}` } });
			await prisma.ldLeadNotificationProcess.update({
				where: { id },
				data: { createdAt: rescheduleTime, status: 'SCHEDULED' }
			});
		}

		scheduleJob(rescheduleTime, callbackRequeue);
	};

	// Schedule Requeue Lead
	scheduleJob(scheduledTime, callbackRequeue).on('error', callbackErrorFn).on('canceled', callbackErrorFn);
};
