import { actionsSchema } from '$lib/config/actions/actions.schema';
import { z } from 'zod';

export const affiliateSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	CompanyKey: z.string().min(1)
});

export const companySchema = z.object({
	id: z.string().min(1),
	CompanyKey: z.string().min(1),
	timezone: z.string(),
	workingHours: z.array(
		z.object({
			id: z.string().min(1),
			start: z.date(),
			end: z.date(),
			days: z.string()
		})
	)
});

export const operatorSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	UserKey: z.string().min(1),
	assignNewLeads: z.boolean(),
	assignCallbackLeads: z.boolean()
});

export const supervisorSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	UserKey: z.string().min(1),
	isEscalate: z.boolean(),
	isRequeue: z.boolean()
});

export const notificationAttemptSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	type: z.enum(['push', 'audio']),
	target: z.enum(['all', 'one']),
	messageTemplate: z.string(),
	waitTime: z.number()
});

export const escalationSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	type: z.enum(['push', 'audio']),
	target: z.enum(['all', 'one']),
	messageTemplate: z.string(),
	waitTime: z.number()
});

export const responseSchema = z.object({
	id: z.string().min(1),
	num: z.number(),
	type: z.enum(['sms', 'disposition']),
	values: z.string().min(1),
	actions: actionsSchema
});

export const responseOptionsSchema = z.object({
	id: z.string().min(1),
	totalMaxAttempt: z.number(),
	responsesNoMatchActions: actionsSchema,
	responsesLimitExceedActions: actionsSchema
});

export const ruleSchema = z.object({
	id: z.string().min(1),
	isActive: z.boolean(),
	name: z.string().min(1),
	description: z.string(),
	outboundCallNumber: z.string().min(1),
	overrideOutboundNumber: z.boolean(),
	messagingService: z.enum(['ghl', 'twilio', 'liveChat']),
	smsTemplate: z.string().min(1),
	affiliates: z.array(affiliateSchema),
	companies: z.array(companySchema),
	operators: z.array(operatorSchema),
	supervisors: z.array(supervisorSchema),
	notificationAttempts: z.array(notificationAttemptSchema),
	escalations: z.array(escalationSchema),
	responses: z.array(responseSchema),
	responseOptions: responseOptionsSchema
});

export const ruleChangesSchema = ruleSchema
	.extend({
		affiliates: z
			.object({
				create: z.array(affiliateSchema),
				update: z.array(affiliateSchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		operators: z
			.object({
				create: z.array(operatorSchema),
				update: z.array(operatorSchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		supervisors: z
			.object({
				create: z.array(supervisorSchema),
				update: z.array(supervisorSchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		notificationAttempts: z
			.object({
				create: z.array(notificationAttemptSchema),
				update: z.array(notificationAttemptSchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		escalations: z
			.object({
				create: z.array(escalationSchema),
				update: z.array(escalationSchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		companies: z
			.object({
				create: z.array(companySchema),
				update: z.array(companySchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		responses: z
			.object({
				create: z.array(responseSchema),
				update: z.array(responseSchema.partial().extend({ id: z.string().min(1) })),
				remove: z.array(z.object({ id: z.string().min(1) }))
			})
			.partial(),

		responseOptions: responseOptionsSchema.partial().extend({ id: z.string().min(1) })
	})
	.partial()
	.extend({ id: z.string().min(1) });

export type Rule = z.infer<typeof ruleSchema>;
export type RuleChanges = z.infer<typeof ruleChangesSchema>;
export type Affiliate = z.infer<typeof affiliateSchema>;
export type Company = z.infer<typeof companySchema>;
export type Operator = z.infer<typeof operatorSchema>;
export type Supervisor = z.infer<typeof supervisorSchema>;
export type NotificationAttempt = z.infer<typeof notificationAttemptSchema>;
export type Escalation = z.infer<typeof escalationSchema>;
export type Response = z.infer<typeof responseSchema>;
export type ResponseOptions = z.infer<typeof responseOptionsSchema>;
