import { waitFor } from '$lib/waitFor';
import type {
	LdRule,
	LdRuleNotification,
	LdRuleNotificationAttempt,
	LdRuleOperator,
	LdRuleSupervisor
} from '@prisma/client';
import { checkLeadDistributeCompleted } from '../procedures/distribute.procedure';
import { upsertLead } from './upsertLead';
import type { Rule } from '../../../../zod/rule.schema';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { env } from '$env/dynamic/private';
import { generateNotificationMessage } from './generateNotificationMessage';
import { getUserKey, getUserName } from './getUserValues';

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
	const UserKey = await getUserKey(UserId);
	const message = await generateNotificationMessage(ProspectKey, textTemplate);

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
	const Name = await getUserName(UserId);
	const status = attempt
		? `ATTEMPT #${attempt.num} SENT TO OPERATOR "${UserId}: ${Name}"`
		: `LEAD ESCALATED TO SUPERVISOR "${UserId}: ${Name}"`;
	await upsertLead(ProspectKey, status, { isDistribute: attempt !== undefined });
};

export const sendNotifications = async (
	ProspectKey: string,
	leadId: string,
	rule: LdRule & {
		notification: (LdRuleNotification & { notificationAttempts: LdRuleNotificationAttempt[] }) | null;
		operators: LdRuleOperator[];
		supervisors: LdRuleSupervisor[];
	}
) => {
	if (!rule.notification) return;
	const { notificationAttempts } = rule.notification;
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
		const isLeadCompleted = await checkLeadDistributeCompleted(ProspectKey);
		if (isLeadCompleted) break;
	}

	const supervisorCount = rule.supervisors.filter(({ isEscalate }) => isEscalate).length;

	if (noOperatorFound)
		upsertLead(ProspectKey, `NO OPERATOR FOUND`, supervisorCount === 0 ? { isDistribute: false } : undefined);
	else {
		const isLeadCompleted = await checkLeadDistributeCompleted(ProspectKey);
		if (isLeadCompleted) return;
		upsertLead(ProspectKey, `NO RESPONSE FROM OPERATORS`, supervisorCount === 0 ? { isDistribute: false } : undefined);
	}

	// Send Notification to Supervisor
	await Promise.all(
		rule.supervisors.map(async ({ UserId, textTemplate, isEscalate }) => {
			if (!isEscalate) return;
			await triggerNotification(ProspectKey, leadId, UserId, textTemplate);
		})
	);
};
