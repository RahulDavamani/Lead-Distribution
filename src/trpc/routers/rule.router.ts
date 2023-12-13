import { z } from 'zod';
import { ruleSchema } from '../../zod/rule.schema';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';

const ruleInclude = {
	notification: { include: { notificationAttempts: true } },
	affiliates: { select: { affiliateId: true } },
	operators: { select: { operatorId: true } }
};

export const ruleRouter = router({
	getAll: procedure.query(async () => {
		const rules = await prisma.ldRule.findMany({
			include: {
				_count: true,
				notification: { select: { id: true } }
			}
		});
		return { rules };
	}),

	getById: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		const rule = await prisma.ldRule.findUnique({
			where: { id },
			include: ruleInclude
		});
		return { rule };
	}),

	saveRule: procedure
		.input(ruleSchema)
		.query(
			async ({
				input: {
					id,
					name,
					description,
					ghlContactStatus,
					waitTimeForCustomerResponse,
					notification,
					operators,
					affiliates
				}
			}) => {
				// let notificationId = null;
				// if (notification) {
				// 	await prisma.ldRuleNotificationAttempt.deleteMany({
				// 		where: { ruleNotificationId: notification.id ?? '' }
				// 	});
				// 	notificationId = (
				// 		await prisma.ldRuleNotification.upsert({
				// 			where: { id: id ?? '' },
				// 			create: {
				// 				notificationType: notification.notificationType,
				// 				escalateToSupervisor: notification.escalateToSupervisor,
				// 				supervisorTextTemplate: notification.supervisorTextTemplate,
				// 				notificationAttempts: {
				// 					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				// 					create: notification.notificationAttempts.map(({ id, ...values }) => ({ ...values }))
				// 				}
				// 			},
				// 			update: {
				// 				notificationType: notification.notificationType,
				// 				escalateToSupervisor: notification.escalateToSupervisor,
				// 				supervisorTextTemplate: notification.supervisorTextTemplate,
				// 				notificationAttempts: {
				// 					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				// 					create: notification.notificationAttempts.map(({ id, ...values }) => ({ ...values }))
				// 				}
				// 			}
				// 		})
				// 	).id;
				// } else await prisma.ldRuleNotification.deleteMany({ where: { rule: { id: id ?? '' } } });

				const ruleId = (
					await prisma.ldRule.upsert({
						where: { id: id ?? '' },
						create: {
							name,
							description,
							ghlContactStatus,
							waitTimeForCustomerResponse
						},
						update: {
							name,
							description,
							ghlContactStatus,
							waitTimeForCustomerResponse
						},
						select: { id: true }
					})
				).id;

				await prisma.ldRule_Operator.deleteMany({ where: { ruleId } });
				await prisma.ldRule_Affiliate.deleteMany({ where: { ruleId } });

				await prisma.ldRule_Operator.createMany({
					data: operators.map(({ operatorId }) => ({ ruleId, operatorId }))
				});
				await prisma.ldRule_Affiliate.createMany({
					data: affiliates.map(({ affiliateId }) => ({ ruleId, affiliateId }))
				});

				if (notification) {
					const { notificationType, escalateToSupervisor, supervisorTextTemplate, notificationAttempts } = notification;
					const notificationId = (
						await prisma.ldRuleNotification.upsert({
							where: { id: notification.id ?? '' },
							create: {
								ruleId,
								notificationType,
								escalateToSupervisor,
								supervisorTextTemplate
							},
							update: {
								ruleId,
								notificationType,
								escalateToSupervisor,
								supervisorTextTemplate
							},
							select: { id: true }
						})
					).id;

					await prisma.ldRuleNotificationAttempt.deleteMany({ where: { notificationId } });
					await prisma.ldRuleNotificationAttempt.createMany({
						data: notificationAttempts.map(({ num, textTemplate, waitTime }) => ({
							notificationId,
							num,
							textTemplate,
							waitTime
						}))
					});
				} else await prisma.ldRuleNotification.deleteMany({ where: { ruleId } });

				const rule = await prisma.ldRule.findUnique({
					where: { id: ruleId },
					include: ruleInclude
				});
				return { rule };
			}
		),

	deleteRole: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		await prisma.ldRule.delete({ where: { id } });
		return { id };
	})
});
