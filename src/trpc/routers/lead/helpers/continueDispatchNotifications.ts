import { TRPCError } from '@trpc/server';
import { getAvailableOperators, triggerAudioNotification, triggerPushNotification } from './dispatchNotifications';
import { continueNotificationProcess } from './notificationProcess';
import { generateMessage } from './generateMessage';
import { getUserStr } from './user';
import { updateLeadFunc } from './updateLead';
import { waitFor } from '$lib/waitFor';

export const continueDispatchNotifications = async (ProspectKey: string) => {
	const updateLead = updateLeadFunc(ProspectKey);

	const lead = await prisma.ldLead.findUniqueOrThrow({
		where: { ProspectKey },
		select: {
			ruleId: true,
			notificationProcesses: {
				orderBy: { createdAt: 'desc' },
				take: 1,
				select: { id: true, status: true }
			}
		}
	});

	if (lead.notificationProcesses.length === 0 || lead.notificationProcesses[0].status !== 'ACTIVE')
		throw new TRPCError({ code: 'CONFLICT', message: 'No Active Dispatch Notifications' });
	if (!lead.ruleId) return;

	const process = await continueNotificationProcess(ProspectKey);

	const { operators, supervisors, notificationAttempts, escalations } = await prisma.ldRule.findUniqueOrThrow({
		where: { id: lead.ruleId },
		select: {
			operators: {
				orderBy: { num: 'asc' },
				where: process.callbackNum === 0 ? { assignNewLeads: true } : { assignCallbackLeads: true },
				select: { UserKey: true }
			},
			supervisors: {
				orderBy: { num: 'asc' },
				where: { isEscalate: true },
				select: { UserKey: true, isEscalate: true }
			},
			notificationAttempts: {
				orderBy: { num: 'asc' },
				select: { id: true, num: true, type: true, target: true, messageTemplate: true, waitTime: true }
			},
			escalations: {
				orderBy: { num: 'asc' },
				select: { id: true, num: true, type: true, target: true, messageTemplate: true, waitTime: true }
			}
		}
	});

	// Get available operators
	const allAvailableOperators = await getAvailableOperators();
	const availableOperators = operators.filter(({ UserKey }) =>
		allAvailableOperators.some((operator) => operator.UserKey === UserKey)
	);

	// Notification Attempts
	if (process.notificationAttempts.length !== notificationAttempts.length) {
		const notifiedOperators = process.notificationAttempts.map(({ UserKey }) => UserKey);
		for (const { id: attemptId, num, type, target, messageTemplate, waitTime } of notificationAttempts) {
			if (num <= process.notificationAttempts.length) continue;

			// Check if Lead is already completed
			if (await process.isCompleted()) break;

			// Generate Message
			const message = await generateMessage(ProspectKey, messageTemplate, {
				LeadStatus: `${process.name}, Attempt #${num}`
			});

			let UserKey, log;
			if (target === 'all') {
				// Get Operators
				const UserKeys = availableOperators.map(({ UserKey }) => UserKey);

				if (UserKeys.length) {
					// Trigger Notification
					if (type === 'push') await triggerPushNotification(UserKeys, message);
					else triggerAudioNotification(UserKeys, message);

					log = `${process.name}: Attempt #${num} - ${type} notifications sent to all operators (${UserKeys.length})`;
				} else log = `${process.name}: Attempt #${num} - no operator found`;
			} else {
				// Get Operator
				const operator = availableOperators.find(({ UserKey }) => !notifiedOperators.includes(UserKey));
				UserKey = operator?.UserKey;

				if (UserKey) {
					// Trigger Notification
					if (type === 'push') await triggerPushNotification([UserKey], message);
					else triggerAudioNotification([UserKey], message);
					notifiedOperators.push(UserKey);

					const userStr = await getUserStr(UserKey);
					log = `${process.name}: Attempt #${num} - ${type} notification sent to operator "${userStr}"`;
				} else log = `${process.name}: Attempt #${num} - no operator found`;
			}

			// Log Notification Attempt
			await updateLead({ log: { log } });
			await prisma.ldLeadNotificationAttempt.create({
				data: { notificationProcessId: process.id, attemptId, message, UserKey }
			});

			await waitFor(waitTime);
		}
		if (await process.isCompleted()) return;
	}

	// Escalations
	if (process.escalations.length !== escalations.length) {
		const notifiedSupervisors = process.escalations.map(({ UserKey }) => UserKey);
		for (const { id: escalationId, num, type, target, messageTemplate, waitTime } of escalations) {
			if (num <= process.escalations.length) continue;

			// Check if Lead is already completed
			if (await process.isCompleted()) break;

			// Generate Message
			const message = await generateMessage(ProspectKey, messageTemplate, {
				LeadStatus: `${process.name}, Attempt #${num}`
			});

			let UserKey, log;
			if (target === 'all') {
				// Get Supervisors
				const UserKeys = supervisors.map(({ UserKey }) => UserKey);

				if (UserKeys.length) {
					// Trigger Notification
					if (type === 'push') await triggerPushNotification(UserKeys, message);
					else triggerAudioNotification(UserKeys, message);

					log = `${process.name}: Escalation #${num} - ${type} notifications sent to all supervisors (${UserKeys.length})`;
				} else log = `${process.name}: Escalation #${num}: no supervisor found`;
			} else {
				// Get Supervisor
				const supervisor = supervisors.find(({ UserKey }) => !notifiedSupervisors.includes(UserKey));
				UserKey = supervisor?.UserKey;

				if (UserKey) {
					// Trigger Notification
					if (type === 'push') await triggerPushNotification([UserKey], message);
					else triggerAudioNotification([UserKey], message);
					notifiedSupervisors.push(UserKey);

					const userStr = await getUserStr(UserKey);
					log = `${process.name}: Escalation #${num} - ${type} notification sent to supervisor "${userStr}"`;
				} else log = `${process.name}: Escalation #${num}: no supervisor found`;
			}

			// Log Escalation
			await updateLead({ log: { log } });
			await prisma.ldLeadEscalation.create({
				data: { notificationProcessId: process.id, escalationId, message, UserKey }
			});

			await waitFor(waitTime);
		}
	}

	// Complete Process
	if (!(await process.isCompleted())) await process.completeProcess();
};
