import { waitFor } from '$lib/waitFor';
import type { LdRule, LdRuleNotificationAttempt, LdRuleOperator, LdRuleSupervisor } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { env } from '$env/dynamic/private';
import { generateMessage } from './generateMessage';
import { createLeadNotificationQueue, updateLeadFunc } from './lead.helper';
import { getUserStr } from './user.helper';

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

export const triggerNotification = async (UserKey: string, message: string) => {
	// Generate Token
	const result =
		(await prisma.$queryRaw`Exec p_Report_AuthUserAction 'TK_INS',null,${UserKey},null,'84AE2871-599E-4812-A874-321FA7ED5CF6'`) as [
			{ TokenKey: string }
		];
	const token = result[0].TokenKey;

	// Trigger Notification
	await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
	   @Title = 'Lead Received',
	   @Message = ${message},
	   @UserKeys = ${UserKey},
	   @ExpireInSeconds = 600,
	   @HrefURL = ${`${env.BASE_URL}/leads?BPT=${token}`},
	   @ActionBtnTitle = 'View Lead';`.catch(prismaErrorHandler);
};

export const sendNotifications = async (
	queueType: string,
	ProspectKey: string,
	rule: LdRule & {
		notificationAttempts: LdRuleNotificationAttempt[];
		operators: LdRuleOperator[];
		supervisors: LdRuleSupervisor[];
	}
) => {
	const updateLead = updateLeadFunc(ProspectKey);

	await updateLead({
		log: { log: `${queueType}: Sending notification to operators` },
		isPicked: false
	});
	const { addNotificationAttempt, checkLeadNotificationQueueCompleted, completeLeadNotificationQueue } =
		await createLeadNotificationQueue(queueType, ProspectKey);

	const { notificationAttempts } = rule;
	const availableOperators = await getAvailableOperators();

	const completedAttempts: { attemptId: string; UserKey: string }[] = [];

	let noOperatorFound = false;
	for (const attempt of notificationAttempts) {
		// Get Operator
		const operator = rule.operators.find(
			({ UserKey }) =>
				availableOperators.map(({ UserKey }) => UserKey).includes(UserKey) &&
				!completedAttempts.map(({ UserKey }) => UserKey).includes(UserKey)
		);

		// No Operator Found
		if (!operator) {
			noOperatorFound = attempt.num === 1;
			break;
		}

		// Send Notification to Operator
		const { UserKey } = operator;
		const userStr = await getUserStr(UserKey);
		const message = await generateMessage(ProspectKey, attempt.messageTemplate, { LeadStatus: `queueType` });
		await triggerNotification(UserKey, message);
		completedAttempts.push({ attemptId: attempt.id, UserKey });
		await updateLead({
			log: { log: `${queueType}: Attempt #${attempt.num} sent to operator "${userStr}"` }
		});
		addNotificationAttempt({
			message,
			userType: 'OPERATOR',
			user: { connect: { UserKey: UserKey } },
			attempt: { connect: { id: attempt.id } }
		});
		await waitFor(attempt.waitTime);

		// Check if Lead is already completed
		const isLeadNotificationQueueCompleted = await checkLeadNotificationQueueCompleted();
		if (isLeadNotificationQueueCompleted) break;
	}

	if (noOperatorFound) await updateLead({ log: { log: `${queueType}: No operator found` } });
	else {
		const isLeadNotificationQueueCompleted = await checkLeadNotificationQueueCompleted();
		if (isLeadNotificationQueueCompleted) return;
		await updateLead({ log: { log: `${queueType}: No response from operators` } });
	}

	// Send Notification to Supervisor
	const supervisors = rule.supervisors.filter(({ isEscalate }) => isEscalate);
	if (supervisors.length === 0) await updateLead({ log: { log: `${queueType}: No supervisor found for escalation` } });
	else
		for (const { UserKey, messageTemplate } of supervisors) {
			// Check if Lead is already completed
			const isLeadNotificationQueueCompleted = await checkLeadNotificationQueueCompleted();
			if (isLeadNotificationQueueCompleted) break;

			const userStr = await getUserStr(UserKey);
			const message = await generateMessage(ProspectKey, messageTemplate, { LeadStatus: queueType });
			await triggerNotification(UserKey, message);
			await updateLead({ log: { log: `${queueType}: Lead escalated to supervisor "${userStr}"` } });
			addNotificationAttempt({ message, userType: 'SUPERVISOR', user: { connect: { UserKey: UserKey } } });
		}

	await completeLeadNotificationQueue();
};
