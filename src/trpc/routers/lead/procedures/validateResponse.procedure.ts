import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';
import { actionsInclude } from '$lib/config/actions.config';
import { createLeadResponse, updateLeadFunc } from '../helpers/lead.helper';
import { executeActions } from '../helpers/executeActions';

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
			log: { log: `${validateResponseType}: ${Response}` }
		});

		if (!lead.rule) {
			await updateLead({ log: { log: `${validateResponseType}: Rule not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}

		if (!lead.rule.isActive) {
			await updateLead({ log: { log: `${validateResponseType}: Rule is inactive` } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Get Response
		const response = lead.rule.responses.find(({ values }) =>
			values.split(',').some((value) => Response.toLowerCase().includes(value.toLowerCase()))
		);

		// Execute No Match Actions
		if (!response) {
			await updateLead({ log: { log: `${validateResponseType}: Executing response no match actions` } });
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
			await updateLead({ log: { log: `${validateResponseType}: Executing response limit exceed actions` } });
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
		await updateLead({ log: { log: `${validateResponseType}: Executing response match actions` } });
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
