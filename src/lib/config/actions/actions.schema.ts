import { z } from 'zod';
import { sendSMSSchema } from './sendSMS/sendSMS.schema';
import { completeLeadSchema } from './completeLead/completeLead.schema';
import { scheduleCallbackSchema } from './scheduleCallback/scheduleCallback.schema';

export const actionsSchema = z.object({
	id: z.string(),
	sendSMSActions: z.array(sendSMSSchema),
	scheduleCallbackActions: z.array(scheduleCallbackSchema),
	completeLeadActions: z.array(completeLeadSchema)
});

export type Actions = z.infer<typeof actionsSchema>;
