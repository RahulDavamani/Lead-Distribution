import { z } from 'zod';

export const operatorSchema = z.object({
	UserName: z.string(),
	UserId: z.number(),
	Name: z.string(),
	Email: z.string(),
	Active: z.boolean(),
	License: z.string(),
	LoginAttempts: z.number(),
	Type: z.string(),
	UserLastLogin: z.string(),
	Country: z.string(),
	PhoneNumber: z.string(),
	Location: z.string(),
	DisplayFormat: z.string(),
	Webrtc: z.nullable(z.unknown()),
	TranscribeCalls: z.boolean()
});

export type Operator = z.infer<typeof operatorSchema>;
