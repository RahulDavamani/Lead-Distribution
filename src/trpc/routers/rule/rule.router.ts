/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { ruleSchema } from '../../../zod/rule.schema';
import { procedure, router } from '../../server';
import { prisma } from '../../../prisma/prisma';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { actionsInclude } from '$lib/config/actions/actions.config';
import { getOperators } from './helpers/getOperators';
import { getAffiliates } from './helpers/getAffiliates';
import { createActions, upsertActions } from './helpers/upsertActions';
import { roleTypeSchema } from '../../../stores/auth.store';
import type { Prisma } from '@prisma/client';

export const getRuleById = async (id: string) =>
	await prisma.ldRule
		.findUniqueOrThrow({
			where: { id },
			include: {
				affiliates: { orderBy: { num: 'asc' } },
				operators: { orderBy: { num: 'asc' } },
				supervisors: { orderBy: { num: 'asc' } },
				notificationAttempts: { orderBy: { num: 'asc' } },
				escalations: { orderBy: { num: 'asc' } },
				responses: { include: { actions: actionsInclude }, orderBy: { num: 'asc' } },
				responseOptions: {
					include: {
						responsesLimitExceedActions: actionsInclude,
						responsesNoMatchActions: actionsInclude
					}
				},
				_count: { select: { queuedLeads: true, completedLeads: true } }
			}
		})
		.catch(prismaErrorHandler);

export const ruleRouter = router({
	getAll: procedure.query(async () => {
		const rules = await prisma.ldRule
			.findMany({
				include: { _count: true },
				orderBy: { createdAt: 'desc' }
			})
			.catch(prismaErrorHandler);
		return { rules };
	}),

	getById: procedure.input(z.object({ id: z.string().min(1).nullable() })).query(async ({ input: { id } }) => {
		const rule = id ? await getRuleById(id) : null;
		const affiliates = await getAffiliates();
		const operators = await getOperators();

		const ruleAffiliates = await Promise.all(
			affiliates.map(async (a) => {
				const ruleAffiliate = await prisma.ldRuleAffiliate.findFirst({
					where: { CompanyKey: a.CompanyKey },
					select: { rule: { select: { id: true, name: true } } }
				});
				return { ...a, rule: ruleAffiliate?.rule };
			})
		);

		return {
			rule,
			affiliates: ruleAffiliates,
			operators,
			canDelete: (rule?._count?.queuedLeads ?? 0) + (rule?._count?.completedLeads ?? 0) === 0
		};
	}),

	getForSettings: procedure
		.input(z.object({ UserKey: z.string().min(1), roleType: roleTypeSchema }))
		.query(async ({ input: { UserKey, roleType } }) => {
			let where: Prisma.LdRuleWhereInput;
			switch (roleType) {
				case 'ADMIN':
					where = {};
					break;

				case 'SUPERVISOR':
					where = { supervisors: { some: { UserKey } } };
					break;

				case 'AGENT':
					where = { id: '' };
					break;
			}

			const rules = await prisma.ldRule
				.findMany({
					where,
					select: {
						id: true,
						name: true,
						operators: {
							select: {
								id: true,
								UserKey: true,
								num: true,
								assignNewLeads: true,
								assignCallbackLeads: true,
								user: { select: { VonageAgentId: true, FirstName: true, LastName: true, Email: true } }
							}
						}
					}
				})
				.catch(prismaErrorHandler);

			return { rules };
		}),

	updateOperators: procedure
		.input(z.object({ ruleId: z.string().min(1), operators: ruleSchema.shape.operators }))
		.query(async ({ input: { ruleId, operators } }) => {
			for (const { UserKey, ...values } of operators) {
				await prisma.ldRuleOperator.update({
					where: { ruleId_UserKey: { ruleId, UserKey } },
					data: values
				});
			}
		}),

	saveRule: procedure
		.input(ruleSchema)
		.mutation(
			async ({
				input: {
					id,
					affiliates,
					operators,
					supervisors,
					notificationAttempts,
					escalations,
					responses,
					responseOptions,
					...values
				}
			}) => {
				// Upsert Response Options
				const {
					id: responseOptionsId,
					responsesNoMatchActions,
					responsesLimitExceedActions,
					...responseOptionsValues
				} = responseOptions;
				const responsesNoMatchActionsId = await upsertActions(responsesNoMatchActions);
				const responsesLimitExceedActionsId = await upsertActions(responsesLimitExceedActions);

				await prisma.ldRuleResponseOptions
					.upsert({
						where: { id: responseOptionsId },
						create: {
							id: responseOptionsId,
							...responseOptionsValues,
							responsesNoMatchActionsId,
							responsesLimitExceedActionsId
						},
						update: {
							id: responseOptionsId,
							...responseOptionsValues,
							responsesNoMatchActionsId,
							responsesLimitExceedActionsId
						},
						select: { id: true }
					})
					.catch(prismaErrorHandler);

				// Upsert Rule
				const ruleId = (
					await prisma.ldRule
						.upsert({
							where: { id: id ?? '' },
							create: { ...values, responseOptionsId },
							update: { ...values, responseOptionsId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
				).id;

				// Upsert Affiliates
				const existingAffiliates = await prisma.ldRuleAffiliate.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteAffiliatesId = existingAffiliates
					.filter((ea) => !affiliates.find((a) => a.id === ea.id))
					.map(({ id }) => id);

				await prisma.ldRuleAffiliate
					.deleteMany({ where: { id: { in: deleteAffiliatesId } } })
					.catch(prismaErrorHandler);
				await Promise.all(
					affiliates.map(async ({ id, ...values }) => {
						await prisma.ldRuleAffiliate.upsert({
							where: { id },
							create: { ruleId, id, ...values },
							update: { ruleId, id, ...values },
							select: { id: true }
						});
					})
				);

				// Upsert Operators
				const existingOperators = await prisma.ldRuleOperator.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteOperatorsId = existingOperators
					.filter((eo) => !operators.find((o) => o.id === eo.id))
					.map(({ id }) => id);

				await prisma.ldRuleOperator.deleteMany({ where: { id: { in: deleteOperatorsId } } }).catch(prismaErrorHandler);
				await Promise.all(
					operators.map(async ({ id, ...values }) => {
						await prisma.ldRuleOperator.upsert({
							where: { id },
							create: { ruleId, id, ...values },
							update: { ruleId, id, ...values },
							select: { id: true }
						});
					})
				);

				// Upsert Supervisors
				const existingSupervisors = await prisma.ldRuleSupervisor.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteSupervisorsId = existingSupervisors
					.filter((es) => !supervisors.find((s) => s.id === es.id))
					.map(({ id }) => id);

				await prisma.ldRuleSupervisor
					.deleteMany({ where: { id: { in: deleteSupervisorsId } } })
					.catch(prismaErrorHandler);
				await Promise.all(
					supervisors.map(async ({ id, ...values }) => {
						await prisma.ldRuleSupervisor.upsert({
							where: { id },
							create: { ruleId, id, ...values },
							update: { ruleId, id, ...values },
							select: { id: true }
						});
					})
				);

				// Upsert Notification Attempts
				const existingNotificationAttempts = await prisma.ldRuleNotificationAttempt.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteNotificationAttemptsId = existingNotificationAttempts
					.filter((en) => !notificationAttempts.find((n) => n.id === en.id))
					.map(({ id }) => id);

				await prisma.ldRuleNotificationAttempt
					.deleteMany({ where: { id: { in: deleteNotificationAttemptsId } } })
					.catch(prismaErrorHandler);
				await Promise.all(
					notificationAttempts.map(async ({ id, ...values }) => {
						await prisma.ldRuleNotificationAttempt.upsert({
							where: { id },
							create: { ruleId, id, ...values },
							update: { ruleId, id, ...values },
							select: { id: true }
						});
					})
				);

				// Upsert Escalations
				const existingEscalations = await prisma.ldRuleEscalation.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteEscalationsId = existingEscalations
					.filter((ee) => !escalations.find((e) => e.id === ee.id))
					.map(({ id }) => id);

				await prisma.ldRuleEscalation
					.deleteMany({ where: { id: { in: deleteEscalationsId } } })
					.catch(prismaErrorHandler);
				await Promise.all(
					escalations.map(async ({ id, ...values }) => {
						await prisma.ldRuleEscalation.upsert({
							where: { id },
							create: { ruleId, id, ...values },
							update: { ruleId, id, ...values },
							select: { id: true }
						});
					})
				);

				// Upsert Responses
				const existingResponses = await prisma.ldRuleResponse.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteResponsesId = existingResponses
					.filter((er) => !responses.find((r) => r.id === er.id))
					.map(({ id }) => id);

				await prisma.ldRuleResponse.deleteMany({ where: { id: { in: deleteResponsesId } } }).catch(prismaErrorHandler);

				await Promise.all(
					responses.map(async ({ id, actions, ...values }) => {
						const actionsId = await upsertActions(actions);
						await prisma.ldRuleResponse.upsert({
							where: { id },
							create: { ruleId, id, ...values, actionsId },
							update: { ruleId, id, ...values, actionsId },
							select: { id: true }
						});
					})
				);

				return { ruleId };
			}
		),

	duplicate: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		const {
			id: rId,
			createdAt: rCreatedAt,
			updatedAt: rUpdatedAt,
			affiliates,
			operators,
			supervisors,
			notificationAttempts,
			escalations,
			responses,
			responseOptions,
			_count,
			...values
		} = await getRuleById(id);

		// Upsert Response Options
		const {
			id: roId,
			createdAt,
			updatedAt,
			responsesNoMatchActions,
			responsesLimitExceedActions,
			...responseOptionsValues
		} = responseOptions;

		const responsesNoMatchActionsId = await createActions(responsesNoMatchActions);
		const responsesLimitExceedActionsId = await createActions(responsesLimitExceedActions);

		const { id: responseOptionsId } = await prisma.ldRuleResponseOptions
			.create({
				data: {
					...responseOptionsValues,
					responsesNoMatchActionsId,
					responsesLimitExceedActionsId
				},
				select: { id: true }
			})
			.catch(prismaErrorHandler);

		// Create Rule
		const rules = await prisma.ldRule.findMany({ select: { name: true } }).catch(prismaErrorHandler);
		let name = 'New Rule';
		for (let i = 1; i <= rules.length + 1; i++)
			if (!rules.find((r) => r.name === name)) break;
			else name = `New Rule ${i}`;

		const { id: ruleId } = await prisma.ldRule
			.create({
				data: {
					...values,
					responseOptionsId,
					name
				},
				select: { id: true }
			})
			.catch(prismaErrorHandler);

		// Create Affiliates
		await Promise.all(
			affiliates.map(
				async ({ id, createdAt, updatedAt, ...values }) =>
					await prisma.ldRuleAffiliate
						.create({
							data: { ...values, ruleId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
			)
		);

		// Create Operators
		await Promise.all(
			operators.map(
				async ({ id, createdAt, updatedAt, ...values }) =>
					await prisma.ldRuleOperator
						.create({
							data: { ...values, ruleId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
			)
		);

		// Create Supervisors
		await Promise.all(
			supervisors.map(
				async ({ id, createdAt, updatedAt, ...values }) =>
					await prisma.ldRuleSupervisor
						.create({
							data: { ...values, ruleId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
			)
		);

		// Create Notification Attempts
		await Promise.all(
			notificationAttempts.map(
				async ({ id, createdAt, updatedAt, ...values }) =>
					await prisma.ldRuleNotificationAttempt
						.create({
							data: { ...values, ruleId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
			)
		);

		// Create Escalations
		await Promise.all(
			escalations.map(
				async ({ id, createdAt, updatedAt, ...values }) =>
					await prisma.ldRuleEscalation
						.create({
							data: { ...values, ruleId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
			)
		);

		// Create responses
		await Promise.all(
			responses.map(async ({ id, actions, ...values }) => {
				const actionsId = await createActions(actions);
				await prisma.ldRuleResponse
					.create({
						data: { ...values, ruleId, actionsId },
						select: { id: true }
					})
					.catch(prismaErrorHandler);
			})
		);
	}),

	delete: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		await prisma.ldRule.delete({ where: { id } }).catch(prismaErrorHandler);
		return { id };
	})
});
