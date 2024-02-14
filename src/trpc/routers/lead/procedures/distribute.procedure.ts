import { z } from 'zod';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { procedure } from '../../../server';
import { TRPCError } from '@trpc/server';
import { sendNotifications } from '../helpers/dispatchNotifications';
import { getCompanyKey } from '../helpers/getCompanyKey';
import { createLead, updateLeadFunc } from '../helpers/lead';
import { generateMessage } from '../helpers/generateMessage';
import { getUserStr } from '../helpers/user';
import { sendSMS } from '../helpers/twilio';

export const distributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey } }) => {
		const updateLead = updateLeadFunc(ProspectKey);

		// Check if Lead is already in Queue
		const existingLead = await prisma.ldLead
			.findFirst({
				where: { ProspectKey },
				select: { id: true }
			})
			.catch(prismaErrorHandler);
		if (existingLead) throw new TRPCError({ code: 'CONFLICT', message: 'Lead already exists' });

		// Get CompanyKey
		const CompanyKey = await getCompanyKey(ProspectKey);
		if (!CompanyKey) {
			await createLead(ProspectKey);
			await updateLead({ log: { log: 'Affiliate not found' } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });
		}

		// Find Rule for CompanyKey
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey } } },
				include: {
					notificationAttempts: { orderBy: { num: 'asc' } },
					operators: true,
					supervisors: true
				},
				orderBy: { createdAt: 'desc' }
			})
			.catch(prismaErrorHandler);

		// Rule Not Found / Inactive
		if (!rule) {
			await createLead(ProspectKey);
			await updateLead({ log: { log: 'Rule not found' } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}
		if (!rule.isActive) {
			await createLead(ProspectKey);
			await updateLead({ log: { log: 'Rule is inactive' } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Create Lead
		await createLead(ProspectKey, rule.id);
		await updateLead({ log: { log: 'Lead Queued' } });

		// Send SMS
		const { Phone } = await prisma.leadProspect
			.findFirstOrThrow({ where: { ProspectKey }, select: { Phone: true } })
			.catch(prismaErrorHandler);
		const message = await generateMessage(ProspectKey, rule.smsTemplate);
		await sendSMS(Phone ?? '', message);
		await updateLead({
			log: { log: 'Text message sent to customer (SMS #1)' },
			message: { message }
		});

		// Send Notification to Operators
		await sendNotifications('NEW LEAD', ProspectKey, rule);

		return { ProspectKey };
	});

export const redistributeProcedure = procedure
	.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
	.query(async ({ input: { ProspectKey, UserKey } }) => {
		const updateLead = updateLeadFunc(ProspectKey);

		// Check if Lead is already in Queue
		const lead = await prisma.ldLead
			.findFirstOrThrow({
				where: { ProspectKey },
				include: {
					rule: {
						include: {
							notificationAttempts: { orderBy: { num: 'asc' } },
							operators: true,
							supervisors: true
						}
					},
					notificationQueues: { select: { id: true, isCompleted: true } }
				}
			})
			.catch(prismaErrorHandler);
		if (lead.notificationQueues.filter(({ isCompleted }) => !isCompleted).length > 0)
			throw new TRPCError({ code: 'CONFLICT', message: 'Lead is busy' });

		const queueNum = lead.notificationQueues.length + 1;
		const queueType = `SUPERVISOR REQUEUE #${queueNum} (SUPERVISOR)`;

		// Create Lead Requeue
		const userStr = await getUserStr(UserKey);
		await updateLead({ log: { log: `${queueType}: Lead requeued by "${userStr}"` } });

		// Rule Not Found / Inactive
		if (!lead.rule) {
			await updateLead({ log: { log: `${queueType}: Rule not found` } });
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		}
		if (!lead.rule.isActive) {
			await updateLead({ log: { log: `${queueType}: Rule is inactive` } });
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
		}

		// Send Notification to Operators
		await sendNotifications(queueType, ProspectKey, lead.rule);

		return { ProspectKey };
	});
