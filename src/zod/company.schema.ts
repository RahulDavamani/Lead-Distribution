import { z } from 'zod';

export const companySchema = z.object({
	CompanyKey: z.string(),
	CompanyName: z.string().nullable()
});

export type Company = z.infer<typeof companySchema>;
