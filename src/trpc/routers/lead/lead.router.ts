import { z } from 'zod';
import { procedure, router } from '../../server';
import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { prospectInputSchema } from '../../../zod/prospectInput.schema';
import { distributeProcedure, redistributeProcedure } from './procedures/distribute.procedure';
import { upsertLead } from './helpers/upsertLead';
import { getCompletedProcedure, getQueuedProcedure } from './procedures/getLeads.procedure';
import { getUserId, getUserName } from './helpers/getUserValues';
import { getCompanyKey } from './helpers/getCompanyKey';
import { updateDispositionProcedure } from './procedures/updateDisposition.procedure';

export const leadRouter = router({
	getQueued: getQueuedProcedure,
	getCompleted: getCompletedProcedure,
	distribute: distributeProcedure,
	redistribute: redistributeProcedure,
	updateDisposition: updateDispositionProcedure,

	getLeadDetails: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		const lead = await prisma.ldLead
			.findUniqueOrThrow({
				where: { id },
				select: {
					ProspectKey: true,
					history: { orderBy: { createdAt: 'asc' } },
					attempts: { orderBy: { createdAt: 'asc' } },
					calls: { orderBy: { createdAt: 'asc' } },
					requeues: { orderBy: { createdAt: 'asc' } },
					dispositions: { orderBy: { createdAt: 'asc' } }
				}
			})
			.catch(prismaErrorHandler);

		const attempts = [];
		for (const attempt of lead.attempts) attempts.push({ ...attempt, name: await getUserName(attempt.UserId) });

		const calls = [];
		for (const call of lead.calls) calls.push({ ...call, name: await getUserName(call.UserId) });

		const requeues = [];
		for (const requeue of lead.requeues) {
			const supervisorName = requeue.UserId ? await getUserName(requeue.UserId) : undefined;
			const disposition = await prisma.ldRuleDispositionRule
				.findUnique({ where: { id: requeue.dispositionRuleId ?? '' } })
				.catch(prismaErrorHandler);

			requeues.push({
				...requeue,
				supervisorName,
				dispositionNum: disposition?.num
			});
		}

		return { ...lead, attempts, calls, requeues };
	}),

	validateToken: procedure.input(z.object({ token: z.string().min(1) })).query(async ({ input: { token } }) => {
		const { createdAt, ProspectKey, UserKey } = await prisma.ldLeadToken
			.findUniqueOrThrow({ where: { id: token } })
			.catch(prismaErrorHandler);
		await prisma.ldLeadToken.delete({ where: { id: token } }).catch(prismaErrorHandler);

		if (createdAt < new Date(Date.now() - 1000 * 60 * 60 * 24))
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expired' });

		return { ProspectKey, UserKey };
	}),

	view: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1).optional() }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const UserId = await getUserId(UserKey);

			const lead = await prisma.ldLead
				.findFirst({
					where: {
						ProspectKey,
						attempts: UserId ? { some: { UserId } } : undefined
					}
				})
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
			if (lead.isCompleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead is completed/closed' });
			if (lead.isCall) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead has been responded' });

			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);

			return { lead, prospect };
		}),

	callCustomer: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			// Check if Lead is Completed/Closed
			const lead = await prisma.ldLead
				.findFirst({
					where: { ProspectKey },
					select: { id: true, isCompleted: true }
				})
				.catch(prismaErrorHandler);
			if (!lead || lead.isCompleted)
				throw new TRPCError({ code: 'CONFLICT', message: 'Lead already completed/closed' });
			const UserId = (await getUserId(UserKey)) as number;

			// Find Prospect
			const CompanyKey = await getCompanyKey(ProspectKey);

			// No Company Key in Prospect
			if (!CompanyKey) throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });

			// Call Customer
			const outboundCallNumber = (
				await prisma.ldRule
					.findFirstOrThrow({
						where: { affiliates: { some: { CompanyKey } } },
						select: { outboundCallNumber: true }
					})
					.catch(prismaErrorHandler)
			).outboundCallNumber;
			await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${UserId},${outboundCallNumber}`.catch(
				prismaErrorHandler
			);

			// Update Lead Status & Create Lead Call
			const Name = await getUserName(UserId);
			await upsertLead(ProspectKey, `LEAD RESPONDED BY "${UserId}: ${Name}"`, { isDistribute: false, isCall: true });
			await prisma.ldLeadCall.create({ data: { leadId: lead.id, UserId } }).catch(prismaErrorHandler);
			return { ProspectKey };
		}),

	close: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
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
				UserId
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
