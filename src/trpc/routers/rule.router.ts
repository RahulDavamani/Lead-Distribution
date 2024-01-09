import { z } from 'zod';
import { ruleSchema } from '../../zod/rule.schema';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';

export const getRuleById = async (id: string) =>
	await prisma.ldRule
		.findUnique({
			where: { id },
			include: {
				notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } },
				affiliates: { select: { CompanyKey: true } },
				operators: { select: { UserId: true } },
				supervisors: true,
				dispositionRules: { orderBy: { num: 'asc' } }
			}
		})
		.catch(prismaErrorHandler);

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
		.query(async ({ input: { id, operators, affiliates, notification, supervisors, dispositionRules, ...values } }) => {
			// Upsert Rule
			const ruleId = (
				await prisma.ldRule
					.upsert({
						where: { id: id ?? '' },
						create: { ...values },
						update: { ...values },
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
				const { id, notificationAttempts, ...values } = notification;
				const notificationId = (
					await prisma.ldRuleNotification
						.upsert({
							where: { id: id ?? '' },
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
						.catch(prismaErrorHandler)
				).id;

				// Upsert Notification Attempts
				const existingNotificationAttempts = await prisma.ldRuleNotificationAttempt.findMany({
					where: { notificationId },
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
							create: { notificationId, ...values },
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
				dispositionRules.map(async ({ id, ...values }) => {
					await prisma.ldRuleDispositionRule.upsert({
						where: { id: id ?? '' },
						create: { ruleId, ...values },
						update: { ...values }
					});
				})
			);

			const rule = await getRuleById(ruleId);
			return { rule };
		}),

	deleteRole: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		await prisma.ldRule.delete({ where: { id } }).catch(prismaErrorHandler);
		return { id };
	})
});
