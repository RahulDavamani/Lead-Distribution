import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';
import { getCompanyKey } from '../helpers/getCompanyKey';
import { upsertLead } from '../helpers/upsertLead';
import { generateNotificationMessage } from '../helpers/generateNotificationMessage';
import { sendNotifications } from '../helpers/sendNotifications';
import { scheduleJob } from 'node-schedule';
import { updateGHLSmsTemplate } from '../helpers/ghl';

export const updateDispositionProcedure = procedure
	.input(
		z.object({
			ProspectKey: z.string().min(1),
			Disposition: z.string().min(1)
		})
	)
	.query(async ({ input: { ProspectKey, Disposition } }) => {
		// Check if Lead is already in Queue
		const lead = await prisma.ldLead.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
		if (lead.isCompleted || lead.isDistribute)
			throw new TRPCError({ code: 'CONFLICT', message: 'Lead is Completed or In Progress' });
		if (!lead.isCall) throw new TRPCError({ code: 'CONFLICT', message: 'Lead is not in Call' });

		// Get CompanyKey
		const CompanyKey = await getCompanyKey(ProspectKey);
		if (!CompanyKey) throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });

		// Find Rule for Company
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey } } },
				include: {
					notification: { include: { notificationAttempts: { orderBy: { num: 'asc' } } } },
					operators: true,
					dispositionRules: true
				}
			})
			.catch(prismaErrorHandler);
		if (!rule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
		if (!rule.isActive)
			throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });

		// Update Disposition
		const dispositionCount = await prisma.ldLeadDisposition
			.count({ where: { leadId: lead.id } })
			.catch(prismaErrorHandler);
		await upsertLead(ProspectKey, `Call Disposition #${dispositionCount + 1}: ${Disposition}`, { isCall: false });

		// Find Disposition Rule
		const dispositionRule = rule.dispositionRules.find(({ num }) => num === dispositionCount + 1);

		// Create Lead Disposition
		const message = await generateNotificationMessage(ProspectKey, dispositionRule?.smsTemplate ?? '');
		await prisma.ldLeadDisposition.create({
			data: {
				leadId: lead.id,
				dispositionRuleId: dispositionRule?.id,
				disposition: Disposition,
				message: dispositionRule
					? dispositionRule.dispositions.includes(Disposition)
						? message
						: 'Message not sent (Lead Completed)'
					: 'Message not sent (Lead Closed)'
			}
		});

		// Close Lead if no Disposition Rule
		if (!dispositionRule) {
			await upsertLead(ProspectKey, 'LEAD CLOSED', { isCall: false, isDistribute: false, isCompleted: true });
			return;
		}

		// Check if Disposition matches
		if (!dispositionRule.dispositions.includes(Disposition)) {
			const { UserId } = (
				await prisma.ldLeadCall
					.findMany({
						where: { leadId: lead.id },
						select: { UserId: true },
						orderBy: { createdAt: 'desc' }
					})
					.catch(prismaErrorHandler)
			)[0];
			await upsertLead(ProspectKey, 'LEAD COMPLETED', {
				isCall: false,
				isDistribute: false,
				isCompleted: true,
				UserId
			});
			return;
		}

		// Update GHL SMS Template
		await updateGHLSmsTemplate(ProspectKey, dispositionRule.smsTemplate);

		// Schedule Requeue
		const scheduledTime = new Date(Date.now() + dispositionRule.requeueTime * 1000);
		scheduleJob(scheduledTime, async () => {
			// Check if Lead is already in Queue
			const lead = await prisma.ldLead.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
			if (lead.isCompleted || lead.isDistribute || lead.isCall)
				throw new TRPCError({ code: 'CONFLICT', message: 'Lead is Completed or In Progress or In Call' });

			// Requeue Lead
			await prisma.ldLeadRequeue
				.create({ data: { leadId: lead.id, dispositionRuleId: dispositionRule.id } })
				.catch(prismaErrorHandler);
			await upsertLead(ProspectKey, `LEAD REQUEUED BY CALL DISPOSITION #${dispositionRule.num}`, {
				isDistribute: true
			});
			await sendNotifications(ProspectKey, lead.id, rule);
		});

		// Update Lead Status
		await upsertLead(ProspectKey, `LEAD REQUEUE SCHEDULED AT ${scheduledTime.toLocaleString()}`);
	});
