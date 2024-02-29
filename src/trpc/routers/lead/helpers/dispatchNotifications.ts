import { prisma } from '../../../../prisma/prisma';
import { waitFor } from '$lib/waitFor';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { env } from '$env/dynamic/private';
import { generateMessage } from './generateMessage';
import { startNotificationProcess } from './notificationProcess';
import { updateLeadFunc } from './updateLead';

export const dispatchNotifications = async (ProspectKey: string, callbackNum: number, requeueNum: number) => {
	const updateLead = updateLeadFunc(ProspectKey);

	// Create Notification Process
	const process = await startNotificationProcess(ProspectKey, callbackNum, requeueNum);

	// Get Rule
	const { rule } = await prisma.ldLead.findUniqueOrThrow({
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
					escalations: {
						orderBy: { num: 'asc' },
						select: { id: true, num: true, messageTemplate: true, waitTime: true }
					},
					notificationAttempts: {
						orderBy: { num: 'asc' },
						select: { id: true, num: true, messageTemplate: true, waitTime: true }
					}
				}
			}
		}
	});
	if (!rule) return;
	const { notificationAttempts, operators, supervisors, escalations } = rule;

	if (notificationAttempts.length === 0)
		return await updateLead({ log: { log: `${process.name}: No notification attempts found` } });

	const availableOperators = await getAvailableOperators();
	const completedAttempts: { attemptId: string; UserKey: string }[] = [];

	let noOperatorFound = false;
	for (const { id: attemptId, num, messageTemplate, waitTime } of notificationAttempts) {
		// Check if Lead is already completed
		const isCompleted = await process.isCompleted();
		if (isCompleted) break;

		// Get Operator
		const operator = operators.find(
			({ UserKey }) =>
				availableOperators.map(({ UserKey }) => UserKey).includes(UserKey) &&
				!completedAttempts.map(({ UserKey }) => UserKey).includes(UserKey)
		);

		// No Operator Found
		if (!operator) {
			noOperatorFound = num === 1;
			break;
		}

		// Trigger Notification to Operator
		const { UserKey } = operator;
		const message = await generateMessage(ProspectKey, messageTemplate, {
			LeadStatus: `${process.name}, Attempt #${num}`
		});
		await triggerNotification(UserKey, message);

		// Log Notification Attempt
		completedAttempts.push({ attemptId, UserKey });
		process.addNotificationAttempt(num, {
			message,
			user: { connect: { UserKey } },
			attempt: { connect: { id: attemptId } }
		});
		await waitFor(waitTime);
	}

	// Check if Lead is already completed
	const isCompleted = await process.isCompleted();
	if (isCompleted) return;

	if (noOperatorFound) await updateLead({ log: { log: `${process.name}: No operator found` } });
	else await updateLead({ log: { log: `${process.name}: No response from operators` } });

	// Send Notification to Supervisor
	if (escalations.length === 0) return await updateLead({ log: { log: `${process.name}: No escalations found` } });
	if (supervisors.length === 0)
		return await updateLead({ log: { log: `${process.name}: No supervisor found for escalation` } });

	outer: for (const { id, num, messageTemplate, waitTime } of escalations) {
		const isCompleted = await process.isCompleted();
		if (isCompleted) break;
		await updateLead({ log: { log: `${process.name}: Escalation #${num}` } });
		for (const { UserKey } of supervisors) {
			// Check if Lead is already completed
			const isCompleted = await process.isCompleted();
			if (isCompleted) break outer;

			// Trigger Notification to Supervisor
			const message = await generateMessage(ProspectKey, messageTemplate, {
				LeadStatus: `${process.name}, Escalation #${num}`
			});
			await triggerNotification(UserKey, message);

			// Log Escalation
			process.addEscalation({
				message,
				user: { connect: { UserKey: UserKey } },
				escalation: { connect: { id } }
			});
		}
		await waitFor(waitTime);
	}

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
