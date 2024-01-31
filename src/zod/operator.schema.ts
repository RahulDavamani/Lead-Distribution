import { z } from 'zod';

export const operatorSchema = z.object({
	UserKey: z.string(),
	VonageAgentId: z.string(),
	FirstName: z.string(),
	LastName: z.string(),
	Email: z.string()
});

export type Operator = z.infer<typeof operatorSchema>;
