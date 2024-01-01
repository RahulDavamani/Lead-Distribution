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

		const rules = [];
		for (const rule of ldRules) {
			const CompanyKeys = rule.affiliates.map(({ CompanyKey }) => CompanyKey);
			const ProspectKeys: string[] = [];
			for (const CompanyKey of CompanyKeys) {
				const keys = (await prisma.leadProspect.findMany({ where: { CompanyKey } })).map(
					({ ProspectKey }) => ProspectKey
				);
				ProspectKeys.push(...keys);
			}

			const allLeads = await prisma.ldLead
				.findMany({ where: { ProspectKey: { in: ProspectKeys } }, select: { ProspectKey: true, isCompleted: true } })
				.catch(prismaErrorHandler);
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
					outBoundCall,
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
								outBoundCall,
								ghlContactStatus,
								waitTimeForCustomerResponse
							},
							update: {
								name,
								description,
								outBoundCall,
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

					for (const { id, ...values } of notificationAttempts) {
						await prisma.ldRuleNotificationAttempt.upsert({
							where: { id: id ?? '' },
							create: { ...values },
							update: { ...values }
						});
					}
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
