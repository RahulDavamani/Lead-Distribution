import { z } from 'zod';

export const requeueLeadSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	scheduleTimes: z.string().min(1)
});

export type RequeueLead = z.infer<typeof requeueLeadSchema>;
