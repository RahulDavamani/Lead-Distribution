import { z } from 'zod';

export const ruleSchema = z.object({
	id: z.string().nullable(),
	name: z.string().min(1),
	isActive: z.boolean(),
	description: z.string(),

	outboundCallNumber: z.string().min(1),
	smsTemplate: z.string(),

	operators: z.array(z.object({ UserId: z.number() })),
	affiliates: z.array(z.object({ CompanyKey: z.string().min(1) })),

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

			supervisorUserId: z.number().nullable(),
			supervisorTextTemplate: z.string()
		})
		.nullable(),

	dispositionNotes: z.array(
		z.object({
			id: z.string().nullable(),
			num: z.number(),
			notes: z.string().min(1),
			smsTemplate: z.string(),
			requeueTime: z.number()
		})
	)
});

export type Rule = z.infer<typeof ruleSchema>;
