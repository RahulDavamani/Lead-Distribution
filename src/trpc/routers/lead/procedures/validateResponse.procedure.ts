import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';
import { getCompanyKey } from '../helpers/getCompanyKey';
import { actionsInclude } from '$lib/config/actions.config';
import { completeLead, createLeadResponse, updateLeadFunc } from '../helpers/lead.helper';
import type { Actions } from '$lib/config/actions.schema';
import { generateMessage } from '../helpers/generateMessage';
import { timeToText } from '$lib/client/DateTime';
import { scheduleJob } from 'node-schedule';
import { sendNotifications } from '../helpers/sendNotifications';
import { sendSMS } from '../helpers/twilio';
import { getActionsList } from '$lib/config/utils/getActionsList';

export const executeActions = async (validateResponseType: string, ProspectKey: string, actions: Actions) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const { actionsList } = getActionsList(actions);

	for (const action of actionsList) {
		if (action.requeueLead) {
			// Requeue Lead
			const requeueTimeText = timeToText(action.requeueLead.requeueTime);
			const scheduledTime = new Date(Date.now() + action.requeueLead.requeueTime * 1000);
			scheduleJob(scheduledTime, async () => {
				// Check if Lead is already in Queue
				const lead = await prisma.ldLead
					.findFirstOrThrow({
						where: { ProspectKey },
						include: {
							rule: {
								include: {
									notificationAttempts: { orderBy: { num: 'asc' } },
									operators: true,
									supervisors: true
								}
							},
							notificationQueues: { select: { id: true, isCompleted: true, UserKey: true, responseId: true } }
						}
					})
					.catch(prismaErrorHandler);
				if (lead.notificationQueues.filter(({ isCompleted }) => !isCompleted).length > 0)
					throw new TRPCError({ code: 'CONFLICT', message: 'Lead is busy' });

				const queueNum = lead.notificationQueues.filter(({ responseId }) => responseId !== null).length + 1;
				const queueType = `CALLBACK REQUEUE #${queueNum}`;

				// Create Lead Requeue
				await updateLead({ status: { status: `${queueType}: Lead requeued by response action` } });

				// Get CompanyKey
				const CompanyKey = await getCompanyKey(ProspectKey);
				if (!CompanyKey) {
					await updateLead({ status: { status: `${queueType}: Affiliate not found` } });
					throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
				}

				// Rule Not Found / Inactive
				if (!lead.rule) {
					await updateLead({ status: { status: `${queueType}: Rule not found` } });
					throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
				}
				if (!lead.rule.isActive) {
					await updateLead({ status: { status: `${queueType}: Rule is inactive` } });
					throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
				}

				// Send Notification to Operators
				await sendNotifications(queueType, ProspectKey, lead.rule);
			});
			await updateLead({ status: { status: `${validateResponseType}: Lead requeue scheduled in ${requeueTimeText}` } });
		}

		// Send SMS
		if (action.sendSMS) {
			const { Phone } = await prisma.leadProspect
				.findFirstOrThrow({ where: { ProspectKey }, select: { Phone: true } })
				.catch(prismaErrorHandler);
			const message = await generateMessage(ProspectKey, action.sendSMS.smsTemplate);
			await sendSMS(Phone ?? '', message);
			const {
				_count: { messages }
			} = await prisma.ldLead
				.findUniqueOrThrow({ where: { ProspectKey }, select: { _count: { select: { messages: true } } } })
				.catch(prismaErrorHandler);
			await updateLead({
				status: { status: `${validateResponseType}: Text message sent to customer (SMS #${messages + 1})` },
				message: { message }
			});
		}

		// Complete Lead
		if (action.completeLead) {
			await completeLead(ProspectKey);
			await updateLead({ status: { status: `Lead completed` } });
			break;
		}

		// Close Lead
		if (action.closeLead) {
			await completeLead(ProspectKey, 'Close Lead');
			await updateLead({ status: { status: `Lead closed by response action` } });
			break;
		}
	}
};

export const validateResponseProcedure = procedure
	.input(
		z.object({
			ProspectKey: z.string().min(1),
			ResponseType: z.enum(['disposition', 'sms']),
			Response: z.string().min(1)
		})
	)
	.query(async ({ input: { ProspectKey, ResponseType, Response } }) => {
		const updateLead = updateLeadFunc(ProspectKey);
		// Check if Lead is already in Queue
		const lead = await prisma.ldLead
			.findUniqueOrThrow({
				where: { ProspectKey },
				include: {
					rule: {
						include: {
							responses: { include: { actions: actionsInclude }, orderBy: { num: 'asc' } },
							responseOptions: {
								include: {
									responsesLimitExceedActions: actionsInclude,
									responsesNoMatchActions: actionsInclude
								}
							}
						}
					},
					responses: { include: { actions: { select: { responseActions: { select: { id: true } } } } } }
				}
			})
			.catch(prismaErrorHandler);

		const validateResponseType = `VALIDATING ${ResponseType.toUpperCase()} RESPONSE #${lead.responses.length + 1}`;
		await updateLead({
			status: { status: `${validateResponseType}: ${Response}` }
		});

		// Get CompanyKey
		const CompanyKey = await getCompanyKey(ProspectKey);
		if (!CompanyKey) {
			await updateLead({ status: { status: `${validateResponseType}: Affiliate not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
		}

		if (!lead.rule) {
			await updateLead({ status: { status: `${validateResponseType}: Rule not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}

		if (!lead.rule.isActive) {
			await updateLead({ status: { status: `${validateResponseType}: Rule is inactive` } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Get Response
		const response = lead.rule.responses.find(({ values }) =>
			values.split(',').some((value) => Response.includes(value))
		);

		// Execute No Match Actions
		if (!response) {
			await updateLead({ status: { status: `${validateResponseType}: Executing response no match actions` } });
			const { completeLeadResponse } = await createLeadResponse(ProspectKey, {
				isCompleted: false,
				type: ResponseType,
				responseValue: Response,
				actionType: 'NO MATCH',
				actions: { connect: { id: lead.rule.responseOptions.responsesNoMatchActions.id } }
			});
			await executeActions(validateResponseType, ProspectKey, lead.rule.responseOptions.responsesNoMatchActions);
			await completeLeadResponse();
			return;
		}

		// Execute Limit Exceed Actions
		const responseAttempts = lead.responses.filter(({ actionsId }) => actionsId === response.actionsId).length;
		if (lead.responses.length >= lead.rule.responseOptions.totalMaxAttempt || responseAttempts >= response.maxAttempt) {
			await updateLead({ status: { status: `${validateResponseType}: Executing response limit exceed actions` } });
			const { completeLeadResponse } = await createLeadResponse(ProspectKey, {
				isCompleted: false,
				type: ResponseType,
				responseValue: Response,
				actionType: 'LIMIT EXCEED',
				actions: { connect: { id: lead.rule.responseOptions.responsesLimitExceedActions.id } }
			});
			await executeActions(validateResponseType, ProspectKey, lead.rule.responseOptions.responsesLimitExceedActions);
			await completeLeadResponse();
			return;
		}

		// Execute Response Actions
		await updateLead({ status: { status: `${validateResponseType}: Executing response match actions` } });
		const { completeLeadResponse } = await createLeadResponse(ProspectKey, {
			isCompleted: false,
			type: ResponseType,
			responseValue: Response,
			actionType: `RESPONSE #${lead.responses.length + 1}`,
			actions: { connect: { id: response.actions.id } }
		});
		await executeActions(validateResponseType, ProspectKey, response.actions);
		await completeLeadResponse();
	});
