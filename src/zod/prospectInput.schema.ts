import { z } from 'zod';

export const prospectInputSchema = z.object({
	LeadID: z.string().min(1),
	CustomerInfo: z.object({
		FirstName: z.string().min(1),
		LastName: z.string().min(1),
		Email: z.string().min(1),
		Phone: z.string().min(1),
		Address: z.string().min(1),
		ZipCode: z.string().min(1)
	}),
	TrustedFormCertUrl: z.literal('TrustedFormCertUrl.com'),
	ConsentToContact: z.string(),
	AcceptedTerms: z.string()
});

export type ProspectInput = z.infer<typeof prospectInputSchema>;
