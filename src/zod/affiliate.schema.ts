import { z } from 'zod';

export const affiliateSchema = z.object({
	CompanyKey: z.string().min(1),
	CompanyName: z.string().min(1),
	rule: z
		.object({
			id: z.string().min(1),
			name: z.string().min(1)
		})
		.optional()
});

export type Affiliate = z.infer<typeof affiliateSchema>;
