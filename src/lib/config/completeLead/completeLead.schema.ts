import { z } from 'zod';

export const completeLeadSchema = z.object({
	id: z.string(),
	num: z.number()
});

export type CompleteLead = z.infer<typeof completeLeadSchema>;
