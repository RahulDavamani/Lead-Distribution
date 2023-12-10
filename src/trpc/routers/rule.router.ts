import { z } from 'zod';
import { ruleSchema } from '../../zod/ruleSchema';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';

const ruleInclude = {
	notification: {
		include: { notificationAttempts: true }
	}
};

export const ruleRouter = router({
	getAll: procedure.query(async () => {
		const rules = await prisma.lMRule.findMany({ include: ruleInclude });
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
				const rule = await prisma.lMRule.upsert({
					where: { id: id ?? undefined },
					create: {
						name,
						description,
						ghlContactStatus,
						waitTimeForCustomerResponse,
						notification: notification
							? {
									create: {
										notificationType: notification.notificationType,
										notificationAttempts: {
											// eslint-disable-next-line @typescript-eslint/no-unused-vars
											create: notification.notificationAttempts.map(({ id, ...values }) => ({ ...values }))
										},
										escalateToSupervisor: notification.escalateToSupervisor,
										supervisorTextTemplate: notification.supervisorTextTemplate
									}
							  }
							: undefined,
						operators: { connect: operators },
						affiliates: { connect: affiliates }
					},
					update: {
						name,
						description,
						ghlContactStatus,
						waitTimeForCustomerResponse,
						notification: notification
							? {
									upsert: {
										where: { id: notification.id ?? undefined },
										create: {
											notificationType: notification.notificationType,
											notificationAttempts: {
												// eslint-disable-next-line @typescript-eslint/no-unused-vars
												create: notification.notificationAttempts.map(({ id, ...values }) => ({ ...values }))
											},
											escalateToSupervisor: notification.escalateToSupervisor,
											supervisorTextTemplate: notification.supervisorTextTemplate
										},
										update: {
											notificationType: notification.notificationType,
											notificationAttempts: {
												upsert: notification.notificationAttempts.map(({ id, ...values }) => ({
													where: { id: id ?? undefined },
													create: { ...values },
													update: { ...values }
												}))
											},
											escalateToSupervisor: notification.escalateToSupervisor,
											supervisorTextTemplate: notification.supervisorTextTemplate
										}
									}
							  }
							: { delete: true },
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
