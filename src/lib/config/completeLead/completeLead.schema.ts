import { z } from 'zod';

export const completeLeadSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	success: z.boolean(),
	completeStatus: z.string()
});

export type CompleteLead = z.infer<typeof completeLeadSchema>;
