import { z } from 'zod';

export const scheduleCallbackSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	scheduleTimes: z.string().min(1),
	sendSMS: z.boolean(),
	smsTemplate: z.string().min(1),
	smsWaitTime: z.number()
});

export type ScheduleCallback = z.infer<typeof scheduleCallbackSchema>;
