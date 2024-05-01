import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { actionsSelect } from '$lib/config/actions/actions.config';
import { createActions } from '../helpers/upsertActions';

const schema = z.object({ id: z.string().min(1) });

const method = async ({ id }: z.infer<typeof schema>) => {
	const {
		companies,
		operators,
		supervisors,
		notificationAttempts,
		escalations,
		responses,
		responseOptions,
		...values
	} = await prisma.ldRule
		.findUniqueOrThrow({
			where: { id },
			select: {
				isActive: true,
				description: true,
				outboundCallNumber: true,
				overrideOutboundNumber: true,
				messagingService: true,
				smsTemplate: true,

				operators: { select: { num: true, UserKey: true, assignNewLeads: true, assignCallbackLeads: true } },
				supervisors: { select: { num: true, UserKey: true, isEscalate: true, isRequeue: true } },
				notificationAttempts: { select: { num: true, messageTemplate: true, waitTime: true } },
				escalations: { select: { num: true, messageTemplate: true, waitTime: true } },

				responses: { select: { num: true, type: true, values: true, actions: actionsSelect } },
				responseOptions: {
					select: {
						totalMaxAttempt: true,
						responsesNoMatchActions: actionsSelect,
						responsesLimitExceedActions: actionsSelect
					}
				},

				companies: {
					select: {
						CompanyKey: true,
						workingHours: { select: { start: true, end: true, days: true } }
					}
				}
			}
		})
		.catch(prismaErrorHandler);

	const rules = await prisma.ldRule.findMany({ select: { name: true } }).catch(prismaErrorHandler);
	let name = 'New Rule';
	for (let i = 1; i <= rules.length + 1; i++)
		if (!rules.find((r) => r.name === name)) break;
		else name = `New Rule ${i}`;

	const { responsesNoMatchActions, responsesLimitExceedActions, ...responseOptionsValues } = responseOptions;
	const responsesNoMatchActionsId = await createActions(responsesNoMatchActions);
	const responsesLimitExceedActionsId = await createActions(responsesLimitExceedActions);

	// Create Rule
	const { id: ruleId } = await prisma.ldRule
		.create({
			data: {
				...values,
				name,
				responseOptions: {
					create: {
						...responseOptionsValues,
						responsesNoMatchActionsId,
						responsesLimitExceedActionsId
					}
				},
				operators: { createMany: { data: operators } },
				supervisors: { createMany: { data: supervisors } },
				notificationAttempts: { createMany: { data: notificationAttempts } },
				escalations: { createMany: { data: escalations } }
			},
			select: { id: true }
		})
		.catch(prismaErrorHandler);

	// Create Companies & Responses
	await Promise.all([
		companies.map(async ({ workingHours, ...values }) => {
			await prisma.ldRuleCompany
				.create({
					data: {
						...values,
						ruleId,
						workingHours: { createMany: { data: workingHours } }
					},
					select: { id: true }
				})
				.catch(prismaErrorHandler);
		}),

		responses.map(async ({ actions, ...values }) => {
			const actionsId = await createActions(actions);
			await prisma.ldRuleResponse
				.create({
					data: { ...values, ruleId, actionsId },
					select: { id: true }
				})
				.catch(prismaErrorHandler);
		})
	]);
};

export const duplicate = {
	schema,
	method,
	procedure: procedure.input(schema).mutation(async ({ input }) => await method(input))
};
