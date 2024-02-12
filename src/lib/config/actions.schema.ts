import { z } from 'zod';
import { requeueLeadSchema } from './requeueLead/requeueLead.schema';
import { sendSMSSchema } from './sendSMS/sendSMS.schema';
import { completeLeadSchema } from './completeLead/completeLead.schema';

export const actionsSchema = z.object({
	id: z.string(),
	requeueLeadActions: z.array(requeueLeadSchema),
	sendSMSActions: z.array(sendSMSSchema),
	completeLeadActions: z.array(completeLeadSchema)
});

export type Actions = z.infer<typeof actionsSchema>;
