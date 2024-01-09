import { z } from 'zod';
import { procedure, router } from '../../server';
import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { prospectInputSchema } from '../../../zod/prospectInput.schema';
import { distributeProcedure, redistributeProcedure } from './procedures/distribute.procedure';
import { upsertLead } from './helpers/upsertLead';
import { getCompletedProcedure, getLeadDetailsProcedure, getQueuedProcedure } from './procedures/getLeads.procedure';
import { getUserId, getUserKey, getUserName } from './helpers/getUserValues';
import { getCompanyKey } from './helpers/getCompanyKey';
import { updateDispositionProcedure } from './procedures/updateDisposition.procedure';
import { roleTypeSchema } from '../../../stores/auth.store';
import type { Prisma } from '@prisma/client';

export const leadRouter = router({
	getQueued: getQueuedProcedure,
	getCompleted: getCompletedProcedure,
	getLeadDetails: getLeadDetailsProcedure,

	distribute: distributeProcedure,
	redistribute: redistributeProcedure,
	updateDisposition: updateDispositionProcedure,

	view: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1), roleType: roleTypeSchema }))
		.query(async ({ input: { ProspectKey, UserKey, roleType } }) => {
			const UserId = await getUserId(UserKey);
			let where: Prisma.LdLeadWhereInput = {};
			switch (roleType) {
				case 'ADMIN':
					where = { ProspectKey };
					break;

				case 'SUPERVISOR':
					where = { ProspectKey, rule: { supervisors: { some: { UserId } } } };
					break;

				case 'AGENT':
					where = { ProspectKey, attempts: { some: { UserId } } };
					break;
			}

			const lead = await prisma.ldLead
				.findFirst({
					where,
					include: {
						calls: {
							orderBy: { createdAt: 'desc' },
							take: 1,
							select: { UserId: true }
						}
					}
				})
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
			if (lead.isCompleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead is completed/closed' });

			const latestCallUserKey = lead.calls[0]?.UserId ? await getUserKey(lead.calls[0].UserId) : undefined;
			if (lead.isCall && latestCallUserKey !== UserKey)
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead has been responded' });

			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);

			return { lead, prospect };
		}),

	callCustomer: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const UserId = (await getUserId(UserKey)) as number;

			// Check if Lead is Completed/Closed
			const lead = await prisma.ldLead
				.findFirst({
					where: { ProspectKey },
					select: { id: true, isCompleted: true, rule: { select: { isActive: true, outboundCallNumber: true } } }
				})
				.catch(prismaErrorHandler);
			if (!lead || lead.isCompleted)
				throw new TRPCError({ code: 'CONFLICT', message: 'Lead already completed/closed' });

			// Check if Rule is Active
			if (!lead.rule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
			if (!lead.rule.isActive)
				throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });

			// Get CompanyKey
			const CompanyKey = await getCompanyKey(ProspectKey);
			if (!CompanyKey) throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });

			// Call Customer
			await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${UserId},${lead.rule.outboundCallNumber}`.catch(
				prismaErrorHandler
			);

			// Update Lead Status & Create Lead Call
			const Name = await getUserName(UserId);
			await upsertLead(ProspectKey, `LEAD RESPONDED BY "${UserId}: ${Name}"`, { isDistribute: false, isCall: true });
			await prisma.ldLeadCall.create({ data: { leadId: lead.id, UserId } }).catch(prismaErrorHandler);
			return { ProspectKey };
		}),

	close: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1), closeStatus: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey, closeStatus } }) => {
			// Check if Lead is Completed/Closed
			const lead = await prisma.ldLead
				.findFirst({ where: { ProspectKey }, select: { isCompleted: true } })
				.catch(prismaErrorHandler);
			if (!lead || lead.isCompleted)
				throw new TRPCError({ code: 'CONFLICT', message: 'Lead already completed/closed' });

			// Update Lead Status
			const UserId = (await getUserId(UserKey)) as number;
			const Name = await getUserName(UserId);
			await upsertLead(ProspectKey, `LEAD CLOSED BY "${UserId}: ${Name}"`, {
				isDistribute: false,
				isCall: false,
				isCompleted: true,
				UserId,
				closeStatus
			});
			return { ProspectKey };
		}),

	postLeadProspect: procedure
		.input(z.object({ prospect: prospectInputSchema }))
		.query(async ({ input: { prospect } }) => {
			const url = 'https://openapi.xyzies.com/LeadProspect/PostLead';
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					AccessKey: '9A40BA85-78C1-4327-9021-A1AFC06CE9B9'
				},
				body: JSON.stringify(prospect)
			});
			if (res.status !== 200) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bad Request' });
			return;
		})
});
