import { actionsSchema } from '$lib/config/actions.schema';
import { z } from 'zod';

export const ruleSchema = z.object({
	id: z.string().nullable(),
	name: z.string().min(1),
	isActive: z.boolean(),
	description: z.string(),

	outboundCallNumber: z.string().min(1),
	ghlPostData: z.string().min(1),
	smsTemplate: z.string(),
	waitTimeForCustomerResponse: z.number().nullable(),

	operators: z.array(z.object({ UserId: z.number() })),
	affiliates: z.array(z.object({ CompanyKey: z.string().min(1) })),

	notification: z
		.object({
			id: z.string(),
			notificationType: z.string().min(1),
			notificationAttempts: z.array(
				z.object({
					id: z.string(),
					num: z.number(),
					textTemplate: z.string(),
					waitTime: z.number()
				})
			)
		})
		.nullable(),

	supervisors: z.array(
		z.object({
			id: z.string(),
			UserId: z.number(),
			textTemplate: z.string(),
			isEscalate: z.boolean(),
			isRequeue: z.boolean()
		})
	),

	totalDispositionLimit: z.number(),

	dispositionRules: z.array(
		z.object({
			id: z.string(),
			dispositions: z.string().min(1),
			count: z.number(),
			actions: actionsSchema
		})
	),

	dispositionsNoMatchActions: actionsSchema,
	dispositionsLimitExceedActions: actionsSchema
});

export type Rule = z.infer<typeof ruleSchema>;
