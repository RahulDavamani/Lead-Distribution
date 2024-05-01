import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { createActions } from '../helpers/upsertActions';
import { ruleSchema } from '../../../../zod/rule.schema';

const schema = ruleSchema;

const method = async ({
	affiliates,
	companies,
	operators,
	supervisors,
	notificationAttempts,
	escalations,
	responses,
	responseOptions,
	...values
}: z.infer<typeof schema>) => {
	const { responsesNoMatchActions, responsesLimitExceedActions, ...responseOptionsValues } = responseOptions;
	const responsesNoMatchActionsId = await createActions(responsesNoMatchActions);
	const responsesLimitExceedActionsId = await createActions(responsesLimitExceedActions);

	// Create Rule
	const { id: ruleId } = await prisma.ldRule
		.create({
			data: {
				...values,
				responseOptions: {
					create: {
						...responseOptionsValues,
						responsesNoMatchActionsId,
						responsesLimitExceedActionsId
					}
				},
				affiliates: { createMany: { data: affiliates } },
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

	return {};
};

export const create = {
	schema,
	method,
	procedure: procedure.input(schema).mutation(async ({ input }) => method(input))
};
