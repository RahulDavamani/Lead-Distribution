import { z } from 'zod';

export const ruleSchema = z.object({
	id: z.string().nullable(),
	name: z.string().min(1),
	description: z.string(),

	ghlContactStatus: z.string().min(1),
	waitTimeForCustomerResponse: z.number().nullable(),

	notification: z
		.object({
			id: z.string().nullable(),
			notificationType: z.string().min(1),
			notificationAttempts: z.array(
				z.object({
					id: z.string().nullable(),
					num: z.number(),
					textTemplate: z.string(),
					waitTime: z.number()
				})
			),

			escalateToSupervisor: z.boolean(),
			supervisorTextTemplate: z.string()
		})
		.nullable(),

	operators: z.array(z.object({ id: z.string().min(1) })),
	affiliates: z.array(z.object({ id: z.string().min(1) }))
});

export type Rule = z.infer<typeof ruleSchema>;
