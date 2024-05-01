import { z } from 'zod';

export const operatorSchema = z.object({
	UserKey: z.string().nullable(),
	VonageAgentId: z.string().nullable(),
	FirstName: z.string().nullable(),
	LastName: z.string().nullable(),
	Email: z.string().nullable()
});

export type Operator = z.infer<typeof operatorSchema>;
