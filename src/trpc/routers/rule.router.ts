/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { ruleSchema } from '../../zod/rule.schema';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';
import type { Prisma } from '@prisma/client';
import { keyActionsList } from '$lib/config/actions.config';
import type { Actions } from '$lib/config/actions.schema';

export const actionsInclude: { include: Prisma.LdRuleActionsInclude } = {
	include: Object.fromEntries(keyActionsList.map((k) => [k, true]))
};

export const getRuleById = async (id: string) => {
	return await prisma.ldRule
		.findUnique({
			where: { id },
			include: {
				dispositionsNoMatchActions: actionsInclude,
				dispositionsLimitExceedActions: actionsInclude,
				notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } },
				affiliates: { select: { CompanyKey: true } },
				operators: { select: { UserId: true } },
				supervisors: true,
				dispositionRules: { include: { actions: actionsInclude } }
			}
		})
		.catch(prismaErrorHandler);
};

export const upsertActions = async (actions: Actions) => {
	const { id: actionsId } = await prisma.ldRuleActions.upsert({
		where: { id: actions.id },
		create: {},
		update: Object.fromEntries(keyActionsList.map((k) => [k, { deleteMany: {} }])),
		select: { id: true }
	});
	await prisma.ldRuleActions.update({
		where: { id: actionsId },
		data: Object.fromEntries(keyActionsList.map((k) => [k, { create: actions[k] }]))
	});
	return actionsId;
};

export const ruleRouter = router({
	getAll: procedure.query(async () => {
		const rules = await prisma.ldRule
			.findMany({
				include: {
					_count: true,
					notification: { select: { id: true, _count: true } },
					leads: { select: { isCompleted: true } }
				}
			})
			.catch(prismaErrorHandler);

		return { rules };
	}),

	getById: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		const rule = await getRuleById(id);
		return { rule };
	}),

	saveRule: procedure
		.input(ruleSchema)
		.query(
			async ({
				input: {
					id,
					operators,
					affiliates,
					notification,
					supervisors,
					dispositionRules,
					dispositionsNoMatchActions,
					dispositionsLimitExceedActions,
					...values
				}
			}) => {
				// Upsert Actions
				const dispositionsNoMatchActionsId = await upsertActions(dispositionsNoMatchActions);
				const dispositionsLimitExceedActionsId = await upsertActions(dispositionsLimitExceedActions);

				// Upsert Rule
				const ruleId = (
					await prisma.ldRule
						.upsert({
							where: { id: id ?? '' },
							create: { ...values, dispositionsNoMatchActionsId, dispositionsLimitExceedActionsId },
							update: { ...values, dispositionsNoMatchActionsId, dispositionsLimitExceedActionsId },
							select: { id: true }
						})
						.catch(prismaErrorHandler)
				).id;

				// Upsert Operators and Affiliates
				await Promise.all([
					await prisma.ldRuleOperator.deleteMany({ where: { ruleId } }).catch(prismaErrorHandler),
					await prisma.ldRuleAffiliate.deleteMany({ where: { ruleId } }).catch(prismaErrorHandler)
				]);

				await Promise.all([
					await prisma.ldRuleOperator
						.createMany({
							data: operators.map(({ UserId }) => ({ ruleId, UserId }))
						})
						.catch(prismaErrorHandler),
					await prisma.ldRuleAffiliate
						.createMany({
							data: affiliates.map(({ CompanyKey }) => ({ ruleId, CompanyKey }))
						})
						.catch(prismaErrorHandler)
				]);

				// Upsert Notification
				if (notification) {
					const { notificationAttempts, ...values } = notification;
					await prisma.ldRuleNotification
						.upsert({
							where: { id: values.id },
							create: {
								ruleId,
								...values
							},
							update: {
								ruleId,
								...values
							},
							select: { id: true }
						})
						.catch(prismaErrorHandler);

					// Upsert Notification Attempts
					const existingNotificationAttempts = await prisma.ldRuleNotificationAttempt.findMany({
						where: { notificationId: notification.id },
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
								where: { id: id ?? '' },
								create: { notificationId: notification.id, ...values },
								update: { ...values }
							});
						})
					);
				} else await prisma.ldRuleNotification.delete({ where: { ruleId } }).catch(prismaErrorHandler);

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
							where: { id: id ?? '' },
							create: { ruleId, ...values },
							update: { ...values }
						});
					})
				);

				// Upsert Disposition Notes
				const existingDispositionRules = await prisma.ldRuleDispositionRule.findMany({
					where: { ruleId },
					select: { id: true }
				});
				const deleteDispositionRulesId = existingDispositionRules
					.filter((edr) => !dispositionRules.find((dr) => dr.id === edr.id))
					.map(({ id }) => id);

				await prisma.ldRuleDispositionRule
					.deleteMany({ where: { id: { in: deleteDispositionRulesId } } })
					.catch(prismaErrorHandler);

				await Promise.all(
					dispositionRules.map(async ({ id, actions, ...values }) => {
						const actionsId = await upsertActions(actions);
						await prisma.ldRuleDispositionRule.upsert({
							where: { id },
							create: { ruleId, ...values, actionsId },
							update: { ...values, actionsId }
						});
					})
				);

				const rule = await getRuleById(ruleId);
				return { rule };
			}
		),

	deleteRole: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		await prisma.ldRule.delete({ where: { id } }).catch(prismaErrorHandler);
		return { id };
	})
});
