import { z } from 'zod';

export const requeueLeadSchema = z.object({
	id: z.string(),
	num: z.number(),
	scheduleTime: z.number()
});

export type RequeueLead = z.infer<typeof requeueLeadSchema>;
