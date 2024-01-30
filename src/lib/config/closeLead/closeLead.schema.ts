import { z } from 'zod';

export const closeLeadSchema = z.object({
	id: z.string(),
	num: z.number()
});

export type CloseLead = z.infer<typeof closeLeadSchema>;
