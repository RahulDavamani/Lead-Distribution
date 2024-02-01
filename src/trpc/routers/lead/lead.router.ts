import { z } from 'zod';
import { procedure, router } from '../../server';
import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { prospectInputSchema } from '../../../zod/prospectInput.schema';
import { distributeProcedure, redistributeProcedure } from './procedures/distribute.procedure';
import { getCompletedProcedure, getLeadDetailsProcedure, getQueuedProcedure } from './procedures/getLeads.procedure';
import { getCompanyKey } from './helpers/getCompanyKey';
import { roleTypeSchema } from '../../../stores/auth.store';
import type { Prisma } from '@prisma/client';
import { completeLead, updateLeadFunc } from './helpers/lead.helper';
import { getUserStr, getUserValues } from './helpers/user.helper';
import { validateResponseProcedure } from './procedures/validateResponse.procedure';

export const leadRouter = router({
	getQueued: getQueuedProcedure,
	getCompleted: getCompletedProcedure,
	getLeadDetails: getLeadDetailsProcedure,

	distribute: distributeProcedure,
	redistribute: redistributeProcedure,
	validateResponse: validateResponseProcedure,

	view: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1), roleType: roleTypeSchema }))
		.query(async ({ input: { ProspectKey, UserKey, roleType } }) => {
			let where: Prisma.LdLeadWhereInput = {};
			switch (roleType) {
				case 'ADMIN':
					where = { ProspectKey };
					break;

				case 'SUPERVISOR':
					where = { ProspectKey, rule: { supervisors: { some: { UserKey } } } };
					break;

				case 'AGENT':
					where = { ProspectKey, notificationQueues: { some: { notificationAttempts: { some: { UserKey } } } } };
					break;
			}

			const lead = await prisma.ldLead
				.findFirst({
					where,
					include: {
						calls: {
							orderBy: { createdAt: 'desc' },
							take: 1,
							select: { UserKey: true }
						}
					}
				})
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found in queue' });

			const latestCallUserKey = lead.calls[0]?.UserKey ?? undefined;
			if (lead.isPicked && latestCallUserKey !== UserKey)
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead has been responded' });

			const prospect = await prisma.leadProspect.findFirstOrThrow({ where: { ProspectKey } }).catch(prismaErrorHandler);

			return { lead, prospect };
		}),

	callCustomer: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			const userValues = await getUserValues(UserKey);
			const updateLead = updateLeadFunc(ProspectKey);

			// Check if Lead is Completed/Closed
			const lead = await prisma.ldLead
				.findUnique({
					where: { ProspectKey },
					select: { id: true, rule: { select: { isActive: true, outboundCallNumber: true } } }
				})
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found in queue' });

			// Check if Rule is Active
			if (!lead.rule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
			if (!lead.rule.isActive)
				throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });

			// Get CompanyKey
			const CompanyKey = await getCompanyKey(ProspectKey);
			if (!CompanyKey) throw new TRPCError({ code: 'NOT_FOUND', message: 'Company Key not found' });

			// Call Customer
			await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${userValues?.VonageAgentId},${lead.rule.outboundCallNumber}`.catch(
				prismaErrorHandler
			);

			// Update Lead
			const userStr = await getUserStr(UserKey);
			await updateLead({
				status: { status: `Lead picked by ${userStr}` },
				isPicked: true,
				call: { user: { connect: { UserKey } } }
			});

			// Complete Lead Notification Queue
			await prisma.ldLead.update({
				where: { ProspectKey },
				data: {
					notificationQueues: {
						updateMany: { where: {}, data: { isCompleted: true } }
					}
				}
			});
			return { ProspectKey };
		}),

	close: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1), closeStatus: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey, closeStatus } }) => {
			const updateLead = updateLeadFunc(ProspectKey);

			// Check if Lead is Completed/Closed
			const lead = await prisma.ldLead
				.findFirst({ where: { ProspectKey }, select: { id: true } })
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found in queue' });

			// Update Lead Status
			const userStr = await getUserStr(UserKey);
			await updateLead({ status: { status: `Lead closed by ${userStr}` } });
			await completeLead(ProspectKey, closeStatus);
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
