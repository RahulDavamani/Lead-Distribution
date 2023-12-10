import { z } from 'zod';
import { ruleSchema } from '../../zod/ruleSchema';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';

const ruleInclude = {
	notification: { include: { notificationAttempts: true } },
	affiliates: { select: { id: true } },
	operators: { select: { id: true } }
};

export const ruleRouter = router({
	getAll: procedure.query(async () => {
		const rules = await prisma.lMRule.findMany({
			include: {
				_count: true,
				notification: { select: { id: true } }
			}
		});
		return { rules };
	}),

	getById: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		const rule = await prisma.lMRule.findUnique({
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
				let notificationId = null;
				if (notification) {
					await prisma.lMRuleNotificationAttempt.deleteMany({
						where: { ruleNotificationId: notification.id ?? '' }
					});
					notificationId = (
						await prisma.lMRuleNotification.upsert({
							where: { id: id ?? '' },
							create: {
								notificationType: notification.notificationType,
								escalateToSupervisor: notification.escalateToSupervisor,
								supervisorTextTemplate: notification.supervisorTextTemplate,
								notificationAttempts: {
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									create: notification.notificationAttempts.map(({ id, ...values }) => ({ ...values }))
								}
							},
							update: {
								notificationType: notification.notificationType,
								escalateToSupervisor: notification.escalateToSupervisor,
								supervisorTextTemplate: notification.supervisorTextTemplate,
								notificationAttempts: {
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									create: notification.notificationAttempts.map(({ id, ...values }) => ({ ...values }))
								}
							}
						})
					).id;
				} else await prisma.lMRuleNotification.deleteMany({ where: { rule: { id: id ?? '' } } });

				const rule = await prisma.lMRule.upsert({
					where: { id: id ?? '' },
					create: {
						name,
						description,
						ghlContactStatus,
						waitTimeForCustomerResponse,
						notificationId,
						operators: { connect: operators },
						affiliates: { connect: affiliates }
					},
					update: {
						name,
						description,
						ghlContactStatus,
						waitTimeForCustomerResponse,
						notificationId,
						operators: { set: operators },
						affiliates: { set: affiliates }
					},
					include: ruleInclude
				});

				return { rule };
			}
		),

	deleteRole: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		await prisma.lMRule.delete({ where: { id } });
		return { id };
	})
});
