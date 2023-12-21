import { z } from 'zod';
import { procedure, router } from '../../server';
import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { prospectInputSchema } from '../../../zod/prospectInput.schema';
import { distributeProcedure, redistributeProcedure } from './procedures/distribute.procedure';
import { upsertLead } from './helpers/upsertLead';
import { getCompletedProcedure, getQueuedProcedure } from './procedures/getLeads.procedure';
import { getUserId } from './helpers/getUserId';

export const leadRouter = router({
	getQueued: getQueuedProcedure,
	getCompleted: getCompletedProcedure,
	distribute: distributeProcedure,
	redistribute: redistributeProcedure,

	getHistoryAndAttempts: procedure.input(z.object({ id: z.string().min(1) })).query(async ({ input: { id } }) => {
		const lead = await prisma.ldLead
			.findUniqueOrThrow({
				where: { id },
				select: {
					ProspectKey: true,
					history: { orderBy: { createdAt: 'asc' } },
					attempts: { orderBy: { createdAt: 'asc' } }
				}
			})
			.catch(prismaErrorHandler);

		const attempts = [];

		for (const attempt of lead.attempts) {
			const operators = (await prisma.$queryRaw`select Name from VonageUsers where UserId = ${attempt.UserId}`.catch(
				prismaErrorHandler
			)) as { Name: string | null }[];

			attempts.push({ ...attempt, name: operators[0].Name });
		}

		return { history: lead.history, attempts };
	}),

	view: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1).optional() }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const UserId = await getUserId(UserKey);

			const lead = await prisma.ldLead
				.findFirst({
					where: {
						ProspectKey,
						isCompleted: false,
						attempts: UserId ? { some: { UserId } } : undefined
					}
				})
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);

			return { lead, prospect };
		}),

	complete: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const UserId = await getUserId(UserKey);

			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);
			if (!prospect) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prospect not found' });
			const outBoundCall = (
				await prisma.ldRule
					.findFirstOrThrow({
						where: { affiliates: { some: { CompanyKey: prospect.CompanyKey ?? '' } } },
						select: { outBoundCall: true }
					})
					.catch(prismaErrorHandler)
			).outBoundCall;

			await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${UserId},${outBoundCall}`.catch(
				prismaErrorHandler
			);
			await upsertLead(ProspectKey, 'LEAD RESPONDED', false, true, UserId);
			return { ProspectKey };
		}),

	close: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const UserId = await getUserId(UserKey);

			await upsertLead(ProspectKey, 'LEAD CLOSED', false, true, UserId);
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
