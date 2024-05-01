import { actionsInclude } from '$lib/config/actions/actions.config';
import { ruleResponseTypes } from '$lib/data/ruleResponseTypes';
import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { executeActions } from './executeActions';
import { createLeadResponse } from './leadResponse';
import { updateLeadFunc } from './updateLead';
import type { Actions } from '$lib/config/actions/actions.schema';

export const validateResponse = async (
	ProspectKey: string,
	ResponseType: 'disposition' | 'sms',
	Response: string,
	UserKey?: string
) => {
	const updateLead = updateLeadFunc(ProspectKey);

	// Get Lead
	const lead = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			select: {
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

	// Log Response
	await updateLead({
		log: {
			log: `RESPONSE #${lead.responses.length + 1}: ${Response} (${ruleResponseTypes[ResponseType]})`
		}
	});

	if (!lead.rule) {
		await updateLead({ log: { log: `Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}

	if (!lead.rule.isActive) {
		await updateLead({ log: { log: `Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// Find Rule Response
	const response = lead.rule.responses.find(({ values }) =>
		values.split(',').some((value) => Response.trim().toLowerCase().includes(value.trim().toLowerCase()))
	);

	// Find Response Actions
	let responseActions: { actionType: 'MATCH' | 'NO MATCH' | 'LIMIT EXCEED'; actions: Actions };
	if (!response)
		responseActions = {
			actionType: 'NO MATCH',
			actions: lead.rule.responseOptions.responsesNoMatchActions
		};
	else if (lead.responses.length >= lead.rule.responseOptions.totalMaxAttempt)
		responseActions = {
			actionType: 'LIMIT EXCEED',
			actions: lead.rule.responseOptions.responsesLimitExceedActions
		};
	else
		responseActions = {
			actionType: 'MATCH',
			actions: response.actions
		};

	// Create Response and Execute Actions
	await updateLead({
		log: {
			log: `RESPONSE #${lead.responses.length + 1}: Executing response ${responseActions.actionType.toLowerCase()} actions`
		}
	});
	const { completeLeadResponse } = await createLeadResponse(ProspectKey, {
		isCompleted: false,
		type: ResponseType,
		responseValue: Response,
		actionType: responseActions.actionType,
		actions: { connect: { id: responseActions.actions.id } },
		UserKey
	});
	await executeActions(ProspectKey, responseActions.actions);
	await completeLeadResponse();
};
