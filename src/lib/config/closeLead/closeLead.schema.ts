import { z } from 'zod';

export const closeLeadSchema = z.object({
	id: z.string(),
	num: z.number(),
	closeStatus: z.string()
});

export type CloseLead = z.infer<typeof closeLeadSchema>;
