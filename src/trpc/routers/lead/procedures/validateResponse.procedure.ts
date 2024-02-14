import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';
import { actionsInclude } from '$lib/config/actions.config';
import { upsertLeadFunc } from '../helpers/lead';
import { executeActions } from '../helpers/executeActions';
import { ruleResponseTypes } from '$lib/data/ruleResponseTypes';
import { createLeadResponse } from '../helpers/leadResponse';
import type { Actions } from '$lib/config/actions.schema';

export const validateResponseProcedure = procedure
	.input(
		z.object({
			ProspectKey: z.string().min(1),
			ResponseType: z.enum(['disposition', 'sms']),
			Response: z.string().min(1)
		})
	)
	.query(async ({ input: { ProspectKey, ResponseType, Response } }) => {
		const upsertLead = upsertLeadFunc(ProspectKey);
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

		await upsertLead({
			log: {
				log: `VALIDATING RESPONSE #${lead.responses.length + 1}: ${Response} (${ruleResponseTypes[ResponseType]})`
			}
		});

		if (!lead.rule) {
			await upsertLead({ log: { log: `Rule not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}

		if (!lead.rule.isActive) {
			await upsertLead({ log: { log: `Rule is inactive` } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Get Response
		const response = lead.rule.responses.find(({ values }) =>
			values.split(',').some((value) => Response.toLowerCase().includes(value.toLowerCase()))
		);
		const responseAttempts = lead.responses.filter(({ actionsId }) => actionsId === response?.actionsId).length;

		let responseActions: { actionType: 'MATCH' | 'NO MATCH' | 'LIMIT EXCEED'; actions: Actions };
		if (!response)
			responseActions = {
				actionType: 'NO MATCH',
				actions: lead.rule.responseOptions.responsesNoMatchActions
			};
		else if (
			lead.responses.length >= lead.rule.responseOptions.totalMaxAttempt ||
			responseAttempts >= response.maxAttempt
		)
			responseActions = {
				actionType: 'LIMIT EXCEED',
				actions: lead.rule.responseOptions.responsesLimitExceedActions
			};
		else
			responseActions = {
				actionType: 'MATCH',
				actions: response.actions
			};

		await upsertLead({ log: { log: `Executing response ${responseActions.actionType.toLowerCase()} actions` } });

		const { completeLeadResponse } = await createLeadResponse(ProspectKey, {
			isCompleted: false,
			type: ResponseType,
			responseValue: Response,
			actionType: responseActions.actionType,
			actions: { connect: { id: responseActions.actions.id } }
		});
		await executeActions(ProspectKey, responseActions.actions);
		await completeLeadResponse();
	});
