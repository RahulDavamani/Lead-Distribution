import { z } from 'zod';
import { ruleSchema } from '../../zod/rule.schema';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';

const getRuleById = async (id: string) =>
	await prisma.ldRule
		.findUnique({
			where: { id },
			include: {
				notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } },
				affiliates: { select: { CompanyKey: true } },
				operators: { select: { UserId: true } }
			}
		})
		.catch(prismaErrorHandler);

export const ruleRouter = router({
	getAll: procedure.query(async () => {
		const ldRules = await prisma.ldRule
			.findMany({
				include: {
					_count: true,
					notification: { select: { id: true, _count: true } },
					affiliates: { select: { CompanyKey: true } },
					operators: { select: { UserId: true } }
				}
			})
			.catch(prismaErrorHandler);

		const allLeads = await prisma.ldLead
			.findMany({ select: { ProspectKey: true, isCompleted: true } })
			.catch(prismaErrorHandler);

		const rules = [];
		for (const rule of ldRules) {
			const affiliates = rule.affiliates.map(({ CompanyKey }) => CompanyKey);
			const leads = allLeads.filter(async ({ ProspectKey }) => {
				const prospect = await prisma.leadProspect
					.findFirstOrThrow({ where: { ProspectKey } })
					.catch(prismaErrorHandler);
				return affiliates.includes(prospect.CompanyKey ?? '');
			});

			rules.push({
				...rule,
				queueLeadsCount: leads.filter((l) => !l.isCompleted).length,
				completedLeadsCount: leads.filter((l) => l.isCompleted).length
			});
		}

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
					name,
					description,
					ghlContactStatus,
					waitTimeForCustomerResponse,
					notification,
					operators,
					affiliates
				}
			}) => {
				const ruleId = (
					await prisma.ldRule
						.upsert({
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
						.catch(prismaErrorHandler)
				).id;

				await prisma.ldRule_Operator.deleteMany({ where: { ruleId } }).catch(prismaErrorHandler);
				await prisma.ldRule_Affiliate.deleteMany({ where: { ruleId } }).catch(prismaErrorHandler);

				await prisma.ldRule_Operator
					.createMany({
						data: operators.map(({ UserId }) => ({ ruleId, UserId }))
					})
					.catch(prismaErrorHandler);
				await prisma.ldRule_Affiliate
					.createMany({
						data: affiliates.map(({ CompanyKey }) => ({ ruleId, CompanyKey }))
					})
					.catch(prismaErrorHandler);

				if (notification) {
					const { notificationType, supervisorUserId, supervisorTextTemplate, notificationAttempts } = notification;
					const notificationId = (
						await prisma.ldRuleNotification
							.upsert({
								where: { id: notification.id ?? '' },
								create: {
									ruleId,
									notificationType,
									supervisorUserId,
									supervisorTextTemplate
								},
								update: {
									ruleId,
									notificationType,
									supervisorUserId,
									supervisorTextTemplate
								},
								select: { id: true }
							})
							.catch(prismaErrorHandler)
					).id;

					await prisma.ldRuleNotificationAttempt.deleteMany({ where: { notificationId } }).catch(prismaErrorHandler);
					await prisma.ldRuleNotificationAttempt
						.createMany({
							data: notificationAttempts.map(({ num, textTemplate, waitTime }) => ({
								notificationId,
								num,
								textTemplate,
								waitTime
							}))
						})
						.catch(prismaErrorHandler);
				} else await prisma.ldRuleNotification.deleteMany({ where: { ruleId } }).catch(prismaErrorHandler);

				const rule = await getRuleById(ruleId);
				return { rule };
			}
		),

	deleteRole: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		await prisma.ldRule.delete({ where: { id } }).catch(prismaErrorHandler);
		return { id };
	})
});
