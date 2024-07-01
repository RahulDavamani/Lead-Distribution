import { prisma } from '../../../../prisma/prisma';
import { waitFor } from '$lib/waitFor';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { env } from '$env/dynamic/private';
import { generateMessage } from './generateMessage';
import { startNotificationProcess } from './notificationProcess';
import { updateLeadFunc } from './updateLead';
import { getUserStr } from './user';
import WebSocket from 'ws';
import { socketURL } from '$lib/socketURL';

export const dispatchNotifications = async (ProspectKey: string, callbackNum: number, requeueNum: number) => {
	const updateLead = updateLeadFunc(ProspectKey);

	// Create Notification Process
	const process = await startNotificationProcess(ProspectKey, callbackNum, requeueNum);

	// Get Rule
	const { rule } = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			select: {
				rule: {
					select: {
						operators: {
							orderBy: { num: 'asc' },
							where: callbackNum === 0 ? { assignNewLeads: true } : { assignCallbackLeads: true },
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
				}
			}
		})
		.catch(prismaErrorHandler);
	if (!rule) return;

	const { operators, supervisors, notificationAttempts, escalations } = rule;

	if (notificationAttempts.length === 0)
		return await updateLead({ log: { log: `${process.name}: No notification attempts found` } });

	// Get available operators
	const allAvailableOperators = await getAvailableOperators();
	const availableOperators = operators.filter(({ UserKey }) =>
		allAvailableOperators.some((operator) => operator.UserKey === UserKey)
	);

	// Notification Attempts
	const notifiedOperators: string[] = [];
	for (const { id: attemptId, num, type, target, messageTemplate, waitTime } of notificationAttempts) {
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
		await prisma.ldLeadNotificationAttempt
			.create({ data: { notificationProcessId: process.id, attemptId, message, UserKey } })
			.catch(prismaErrorHandler);
		await updateLead({ log: { log } });

		await waitFor(waitTime);
	}
	if (await process.isCompleted()) return;

	// Escalations
	const notifiedSupervisors: string[] = [];
	for (const { id: escalationId, num, type, target, messageTemplate, waitTime } of escalations) {
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
		await prisma.ldLeadEscalation
			.create({
				data: { notificationProcessId: process.id, escalationId, message, UserKey }
			})
			.catch(prismaErrorHandler);
		await updateLead({ log: { log } });

		await waitFor(waitTime);
	}

	// Complete Process
	if (!(await process.isCompleted())) await process.completeProcess();
};

export const getAvailableOperators = async () => {
	await prisma.$queryRaw`EXEC [p_GetVonageAgentStatus]`.catch(prismaErrorHandler);
	const availableOperators = (await prisma.$queryRaw`
      select Users.UserKey from VonageAgentStatus
      inner join Users on VonageAgentStatus.AgentId=Users.VonageAgentId
      where Status='Ready' and ISNULL(calls,0)=0 and ISNULL(semiLive,0)=0
      and StatusSince > dateadd(hour,-1,getdate())
   `.catch(prismaErrorHandler)) as { UserKey: string }[];
	return availableOperators;
};

export const triggerPushNotification = async (UserKeys: string[], message: string) =>
	await Promise.all(
		UserKeys.map(async (UserKey) => {
			// Generate Token
			const result =
				(await prisma.$queryRaw`Exec p_Report_AuthUserAction 'TK_INS',null,${UserKey},null,'84AE2871-599E-4812-A874-321FA7ED5CF6'`.catch(
					prismaErrorHandler
				)) as [{ TokenKey: string }];
			const token = result[0].TokenKey;

			// Trigger Notification
			await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
            @Title = 'Lead Received',
            @Message = ${message},
            @UserKeys = ${UserKey},
            @ExpireInSeconds = 600,
            @HrefURL = ${`${env.BASE_URL}/leads?BPT=${token}`},
            @ActionBtnTitle = 'View Lead';`.catch(prismaErrorHandler);
		})
	);

export const triggerAudioNotification = async (UserKeys: string[], message: string) => {
	const socket = new WebSocket(socketURL);

	socket.onopen = () => {
		const socketMessage = {
			type: 'triggerAudioNotification',
			data: { UserKeys, message }
		};
		socket.send(JSON.stringify(socketMessage));
		socket.close();
	};
};
