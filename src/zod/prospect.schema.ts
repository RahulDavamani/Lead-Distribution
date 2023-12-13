import { z } from 'zod';

export const prospectSchema = z.object({
	ProspectId: z.number(),
	ProspectKey: z.string(),
	WebCallKey: z.string(),
	RefId: z.string(),
	CustomerFirstName: z.string(),
	CustomerLastName: z.string(),
	Address: z.string(),
	ZipCode: z.string(),
	Phone: z.string(),
	Email: z.string(),
	CreatedOn: z.string(),
	Provider: z.string(),
	Package: z.string(),
	LeadKey: z.string(),
	LeadCreatedOn: z.string(),
	ValidFrom: z.string(),
	ValidTo: z.string(),
	Source: z.number(),
	CompanyKey: z.nullable(z.string()),
	CRMContactID: z.nullable(z.string()),
	TrustedFormCertUrl: z.nullable(z.string()),
	IsAllowedToContact: z.nullable(z.boolean()),
	IsAcceptedTerms: z.nullable(z.boolean()),
	CRMContactCreatedOn: z.nullable(z.string()),
	VonageGuid: z.nullable(z.string()),
	CallAgentId: z.nullable(z.string()),
	FirstResponseAt: z.nullable(z.string()),
	FirstResponseAgentId: z.nullable(z.string()),
	Duration: z.nullable(z.number()),
	Direction: z.nullable(z.string())
});

export type Prospect = z.infer<typeof prospectSchema>;
