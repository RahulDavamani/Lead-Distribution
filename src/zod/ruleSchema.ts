import { z } from 'zod';

export const ruleSchema = z.object({
	id: z.string().nullable(),
	name: z.string().min(1),
	description: z.string().min(1),

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
					textTemplate: z.string().min(1),
					waitTime: z.number()
				})
			),

			escalateToSupervisor: z.boolean(),
			supervisorTextTemplate: z.string().min(1)
		})
		.nullable()
});

export type Rule = z.infer<typeof ruleSchema>;
