import { z } from 'zod';

export const actionsSchema = z.object({
	id: z.string(),
	requeueLeadActions: z.array(
		z.object({
			id: z.string(),
			num: z.number(),
			requeueTime: z.number()
		})
	),
	sendSMSActions: z.array(
		z.object({
			id: z.string(),
			num: z.number(),
			smsTemplate: z.string()
		})
	),
	closeLeadActions: z.array(
		z.object({
			id: z.string(),
			num: z.number()
		})
	),
	completeLeadActions: z.array(
		z.object({
			id: z.string(),
			num: z.number()
		})
	)
});

export type Actions = z.infer<typeof actionsSchema>;
