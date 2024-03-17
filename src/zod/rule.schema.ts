import { actionsSchema } from '$lib/config/actions/actions.schema';
import { z } from 'zod';

export const ruleSchema = z.object({
	id: z.string().nullable(),
	isActive: z.boolean(),
	name: z.string().min(1),
	description: z.string(),

	outboundCallNumber: z.string().min(1),
	messagingService: z.string().min(1),
	smsTemplate: z.string(),

	affiliates: z.array(
		z.object({
			id: z.string().min(1),
			num: z.number(),
			CompanyKey: z.string().min(1)
		})
	),

	operators: z.array(
		z.object({
			id: z.string().min(1),
			num: z.number(),
			UserKey: z.string().min(1),
			assignNewLeads: z.boolean(),
			assignCallbackLeads: z.boolean()
		})
	),

	supervisors: z.array(
		z.object({
			id: z.string().min(1),
			num: z.number(),
			UserKey: z.string().min(1),
			isEscalate: z.boolean(),
			isRequeue: z.boolean()
		})
	),

	notificationAttempts: z.array(
		z.object({
			id: z.string().min(1),
			num: z.number(),
			messageTemplate: z.string(),
			waitTime: z.number()
		})
	),

	escalations: z.array(
		z.object({
			id: z.string().min(1),
			num: z.number(),
			messageTemplate: z.string(),
			waitTime: z.number()
		})
	),

	responses: z.array(
		z.object({
			id: z.string().min(1),
			num: z.number(),
			type: z.string().min(1),
			values: z.string().min(1),
			actions: actionsSchema
		})
	),

	responseOptions: z.object({
		id: z.string().min(1),
		totalMaxAttempt: z.number(),
		responsesNoMatchActions: actionsSchema,
		responsesLimitExceedActions: actionsSchema
	})
});

export type Rule = z.infer<typeof ruleSchema>;
