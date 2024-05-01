import { z } from 'zod';
import { procedure } from '../../../server';
import { ruleChangesSchema } from '../../../../zod/rule.schema';
import { createActions, upsertActions } from '../helpers/upsertActions';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

const schema = ruleChangesSchema.extend({ UserKey: z.string().min(1) });

const method = async ({
	id,
	affiliates,
	companies,
	operators,
	supervisors,
	notificationAttempts,
	escalations,
	responses,
	responseOptions,
	UserKey,
	...values
}: z.infer<typeof schema>) => {
	// Update Rules
	await prisma.ldRule
		.update({
			where: { id },
			data: {
				...values,
				affiliates: {
					deleteMany: affiliates?.remove,
					createMany: affiliates?.create && { data: affiliates.create }
				},
				operators: {
					deleteMany: operators?.remove,
					createMany: operators?.create && { data: operators.create }
				},
				supervisors: {
					deleteMany: supervisors?.remove,
					createMany: supervisors?.create && { data: supervisors.create }
				},
				notificationAttempts: {
					deleteMany: notificationAttempts?.remove,
					createMany: notificationAttempts?.create && { data: notificationAttempts.create }
				},
				escalations: {
					deleteMany: escalations?.remove,
					createMany: escalations?.create && { data: escalations.create }
				},
				companies: {
					deleteMany: companies?.remove
				},
				history: { create: { UserKey } }
			},
			select: { id: true }
		})
		.catch(prismaErrorHandler);

	// Update Rule Relations
	await Promise.all([
		affiliates?.update?.map(
			async ({ id, ...values }) =>
				await prisma.ldRuleAffiliate
					.update({
						where: { id },
						data: values,
						select: { id: true }
					})
					.catch(prismaErrorHandler)
		),

		operators?.update?.map(
			async ({ id, ...values }) =>
				await prisma.ldRuleOperator
					.update({
						where: { id },
						data: values,
						select: { id: true }
					})
					.catch(prismaErrorHandler)
		),

		supervisors?.update?.map(
			async ({ id, ...values }) =>
				await prisma.ldRuleSupervisor
					.update({
						where: { id },
						data: values,
						select: { id: true }
					})
					.catch(prismaErrorHandler)
		),

		notificationAttempts?.update?.map(
			async ({ id, ...values }) =>
				await prisma.ldRuleNotificationAttempt
					.update({
						where: { id },
						data: values,
						select: { id: true }
					})
					.catch(prismaErrorHandler)
		),

		escalations?.update?.map(
			async ({ id, ...values }) =>
				await prisma.ldRuleEscalation
					.update({
						where: { id },
						data: values,
						select: { id: true }
					})
					.catch(prismaErrorHandler)
		),

		companies?.create?.map(async ({ workingHours, ...values }) => {
			await prisma.ldRuleCompany
				.create({
					data: {
						...values,
						ruleId: id,
						workingHours: { createMany: { data: workingHours } }
					},
					select: { id: true }
				})
				.catch(prismaErrorHandler);
		}),

		companies?.update?.map(async ({ id, workingHours, ...values }) => {
			await prisma.ldRuleCompany
				.update({
					where: { id },
					data: values,
					select: { id: true }
				})
				.catch(prismaErrorHandler);

			if (workingHours) {
				await prisma.ldRuleCompanyWorkingHours.deleteMany({ where: { ruleCompanyId: id } });
				await prisma.ldRuleCompanyWorkingHours.createMany({
					data: workingHours.map((workingHour) => ({ ...workingHour, ruleCompanyId: id }))
				});
			}
		}),

		responses?.create?.map(async ({ id, actions, ...values }) => {
			const actionsId = await createActions(actions);
			await prisma.ldRuleResponse
				.update({
					where: { id },
					data: { ...values, actionsId },
					select: { id: true }
				})
				.catch(prismaErrorHandler);
		}),

		responses?.update?.map(async ({ id, actions, ...values }) => {
			const actionsId = actions && (await upsertActions(actions));
			await prisma.ldRuleResponse
				.update({
					where: { id },
					data: { ...values, actionsId },
					select: { id: true }
				})
				.catch(prismaErrorHandler);
		})
	]);

	// Update Response Options
	if (responseOptions) {
		const { responsesNoMatchActions, responsesLimitExceedActions, ...responseOptionsValues } = responseOptions;
		const responsesNoMatchActionsId = responsesNoMatchActions && (await upsertActions(responsesNoMatchActions));
		const responsesLimitExceedActionsId =
			responsesLimitExceedActions && (await upsertActions(responsesLimitExceedActions));
		await prisma.ldRuleResponseOptions
			.update({
				where: { id: responseOptions?.id },
				data: {
					...responseOptionsValues,
					responsesNoMatchActionsId,
					responsesLimitExceedActionsId
				}
			})
			.catch(prismaErrorHandler);
	}

	return {};
};

export const update = {
	schema,
	method,
	procedure: procedure.input(schema).mutation(async ({ input }) => method(input))
};
