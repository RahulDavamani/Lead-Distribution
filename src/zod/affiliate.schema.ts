import { z } from 'zod';

export const affiliateSchema = z.object({
	CompanyKey: z.string().min(1),
	CompanyName: z.string().min(1)
});

export type Affiliate = z.infer<typeof affiliateSchema>;
