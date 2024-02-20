import { z } from 'zod';

export const sendSMSSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	scheduleTimes: z.string().min(1),
	smsTemplate: z.string()
});

export type SendSMS = z.infer<typeof sendSMSSchema>;
