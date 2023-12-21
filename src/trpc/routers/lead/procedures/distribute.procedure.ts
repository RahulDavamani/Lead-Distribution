import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Rule } from '../../../../zod/rule.schema';
import { procedure } from '../../../server';
import { env } from '$env/dynamic/private';
import { TRPCError } from '@trpc/server';
import { waitFor } from '$lib/waitFor';
import { upsertLead } from '../helpers/upsertLead';
import { getOperatorName } from '../helpers/getOperatorName';

export const checkLeadCompleted = async (ProspectKey: string) => {
	return (
		(await prisma.ldLead.findFirst({ where: { ProspectKey }, select: { isCompleted: true } }).catch(prismaErrorHandler))
			?.isCompleted ?? false
	);
};

export const getGHLStatus = async (ProspectKey: string) => {
	const ghlResponse = (await prisma.$queryRaw`Exec [p_GHL_GetProspect] ${ProspectKey}`.catch(prismaErrorHandler)) as {
		Response?: string;
	}[];
	const ghlData = JSON.parse(ghlResponse?.[0]?.Response ?? 'undefined') as {
		contact?: { customFields?: { id: string; value: string }[] };
	};
	const ghlStatus = ghlData?.contact?.customFields?.find((cf) => cf.id === '5DyNSCM7X3blCAWJSteM')?.value;
	return ghlStatus ?? 'GHL STATUS: Not Found';
};

export const getAvailableOperators = async () => {
	await prisma.$queryRaw`EXEC [p_GetVonageAgentStatus]`.catch(prismaErrorHandler);
	const availableOperators =
		(await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready' and ISNULL(calls,0)=0 and ISNULL(semiLive,0)=0 and StatusSince > dateadd(hour,-1,getdate())`.catch(
			prismaErrorHandler
		)) as { AgentId: number }[];
	return availableOperators;
};

export const sendNotification = async (
	ProspectKey: string,
	leadId: string,
	UserId: number,
	textTemplate: string,
	attempt?: NonNullable<Rule['notification']>['notificationAttempts'][number]
) => {
	// Get Prospect
	const prospect = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				CustomerFirstName: true,
				CustomerLastName: true,
				Email: true,
				Address: true,
				ZipCode: true
			}
		})
		.catch(prismaErrorHandler);

	// Generate Message
	let message = textTemplate;
	message = message.replace(/%CustomerFirstName/g, prospect.CustomerFirstName || '');
	message = message.replace(/%CustomerLastName/g, prospect.CustomerLastName || '');
	message = message.replace(/%Email/g, prospect.Email || '');
	message = message.replace(/%Address/g, prospect.Address || '');
	message = message.replace(/%ZipCode/g, prospect.ZipCode || '');

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
				UserId: UserId
			}
		})
		.catch(prismaErrorHandler);

	// Update Lead Status
	const Name = await getOperatorName(UserId);
	const status = attempt
		? `ATTEMPT ${attempt.num} SENT TO OPERATOR "${UserId}: ${Name}"`
		: `LEAD ESCALATED TO SUPERVISOR "${UserId}: ${Name}"`;
	await upsertLead(ProspectKey, status);
};

export const distributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey } }) => {
		// Find Prospect
		const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);

		// Check if Lead is already in Queue
		const existingLead = await prisma.ldLead.findFirst({ where: { ProspectKey } }).catch(prismaErrorHandler);
		if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

		// No Company Key in Prospect
		if (!prospect.CompanyKey) {
			await upsertLead(ProspectKey, 'AFFILIATE NOT FOUND');
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
		}

		// Find Rule for Company
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey: prospect.CompanyKey } } },
				include: { notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } }, operators: true }
			})
			.catch(prismaErrorHandler);

		// No Rule found
		if (!rule) {
			await upsertLead(ProspectKey, 'RULE NOT FOUND');
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}

		// Create Lead
		const lead = await upsertLead(ProspectKey, 'LEAD QUEUED');

		// Wait for Customer Reply
		await upsertLead(ProspectKey, 'WAITING FOR CUSTOMER REPLY');
		await waitFor(rule.waitTimeForCustomerResponse ?? 0);

		// Get GHL Status
		const ghlStatus = await getGHLStatus(ProspectKey);
		await upsertLead(ProspectKey, `GHL STATUS: ${ghlStatus}`);

		// If Customer Reply, Complete Lead
		if (ghlStatus === 'Text Received') {
			await upsertLead(ProspectKey, 'CUSTOMER REPLIED', true);
			return;
		}

		// Check if Lead is already completed
		const isLeadCompleted = await checkLeadCompleted(ProspectKey);
		if (isLeadCompleted) return;

		// Else Send Notification to Operator
		if (rule.notification) {
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
				await sendNotification(ProspectKey, lead.id, operator.UserId, attempt.textTemplate, attempt);
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
				await sendNotification(ProspectKey, lead.id, supervisorUserId, supervisorTextTemplate);
			}
		}

		return { ProspectKey };
	});
