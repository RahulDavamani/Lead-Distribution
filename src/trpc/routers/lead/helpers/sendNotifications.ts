import { waitFor } from '$lib/waitFor';
import type { LdRule, LdRuleNotification, LdRuleNotificationAttempt, LdRule_Operator } from '@prisma/client';
import { checkLeadCompleted } from '../procedures/distribute.procedure';
import { upsertLead } from './upsertLead';
import type { Rule } from '../../../../zod/rule.schema';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { env } from '$env/dynamic/private';
import { getOperatorName } from './getOperatorName';
import { generateNotificationMessage } from './generateNotificationMessage';

export const getAvailableOperators = async () => {
	await prisma.$queryRaw`EXEC [p_GetVonageAgentStatus]`.catch(prismaErrorHandler);
	const availableOperators =
		(await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready' and ISNULL(calls,0)=0 and ISNULL(semiLive,0)=0 and StatusSince > dateadd(hour,-1,getdate())`.catch(
			prismaErrorHandler
		)) as { AgentId: number }[];
	return availableOperators;
};

export const triggerNotification = async (
	ProspectKey: string,
	leadId: string,
	UserId: number,
	textTemplate: string,
	attempt?: NonNullable<Rule['notification']>['notificationAttempts'][number]
) => {
	// Generate Message
	const message = await generateNotificationMessage(ProspectKey, textTemplate);

	const Email = (
		(await prisma.$queryRaw`select Email from VonageUsers where UserId = ${UserId} and Active=1`.catch(
			prismaErrorHandler
		)) as { Email: string }[]
	)[0].Email;
	const UserKey = (
		await prisma.users
			.findFirst({
				where: { Email },
				select: { UserKey: true }
			})
			.catch(prismaErrorHandler)
	)?.UserKey;

	// Send Notification
	await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
	   @Title = 'Lead Received',
	   @Message = ${message},
	   @UserKeys = ${UserKey},
	   @ExpireInSeconds = 600,
	   @HrefURL = ${`${env.BASE_URL}/view-lead?keys=${ProspectKey},${UserKey}`},
	   @ActionBtnTitle = 'View Lead';`.catch(prismaErrorHandler);

	// Create Lead Attempt
	await prisma.ldLeadAttempts
		.create({
			data: {
				leadId,
				attemptId: attempt?.id ?? null,
				UserId: UserId,
				message
			}
		})
		.catch(prismaErrorHandler);

	// Update Lead Status
	const Name = await getOperatorName(UserId);
	const status = attempt
		? `ATTEMPT ${attempt.num} SENT TO OPERATOR "${UserId}: ${Name}"`
		: `LEAD ESCALATED TO SUPERVISOR "${UserId}: ${Name}"`;
	await upsertLead(ProspectKey, status, attempt !== undefined);
};

export const sendNotifications = async (
	ProspectKey: string,
	leadId: string,
	rule: LdRule & {
		notification: (LdRuleNotification & { notificationAttempts: LdRuleNotificationAttempt[] }) | null;
		operators: LdRule_Operator[];
	}
) => {
	if (!rule.notification) return;
	const { notificationAttempts, supervisorUserId, supervisorTextTemplate } = rule.notification;
	const availableOperators = await getAvailableOperators();

	const completedAttempts: { attemptId: string; UserId: number }[] = [];

	let noOperatorFound = false;
	for (const attempt of notificationAttempts) {
		// Get Operator
		const operator = rule.operators.find(
			({ UserId }) =>
				availableOperators.map(({ AgentId }) => AgentId).includes(UserId) &&
				!completedAttempts.map(({ UserId }) => UserId).includes(UserId)
		);

		// No Operator Found
		if (!operator) {
			noOperatorFound = attempt.num === 1;
			break;
		}
		if (attempt.num === 1) await upsertLead(ProspectKey, 'SENDING NOTIFICATION TO OPERATORS');

		// Send Notification to Operator
		await triggerNotification(ProspectKey, leadId, operator.UserId, attempt.textTemplate, attempt);
		completedAttempts.push({ attemptId: attempt.id, UserId: operator.UserId });
		await waitFor(attempt.waitTime);

		// Check if Lead is already completed
		const isLeadCompleted = await checkLeadCompleted(ProspectKey);
		if (isLeadCompleted) break;
	}

	if (noOperatorFound) upsertLead(ProspectKey, `NO OPERATOR FOUND`);
	else {
		const isLeadCompleted = await checkLeadCompleted(ProspectKey);
		if (isLeadCompleted) return;
		upsertLead(ProspectKey, `NO RESPONSE FROM OPERATORS`);
	}

	// Send Notification to Supervisor
	if (supervisorUserId) {
		await triggerNotification(ProspectKey, leadId, supervisorUserId, supervisorTextTemplate);
	}
};
