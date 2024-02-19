import { z } from 'zod';
import { procedure, router } from '../../server';
import { TRPCError } from '@trpc/server';
import { prisma } from '../../../prisma/prisma';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { prospectInputSchema } from '../../../zod/prospectInput.schema';
import { getCompletedProcedure, getLeadDetailsProcedure, getQueuedProcedure } from './procedures/getLeads.procedure';
import { getCompanyKey } from './helpers/getCompanyKey';
import { roleTypeSchema } from '../../../stores/auth.store';
import type { Prisma } from '@prisma/client';
import { completeLead, upsertLeadFunc } from './helpers/lead';
import { getUserStr, getUserValues } from './helpers/user';
import { validateResponseProcedure } from './procedures/validateResponse.procedure';
import { distributeLead, supervisorRedistribute } from './helpers/distributeLead';
import { getLeadsWhere } from './helpers/getLeadsWhere';

export const leadRouter = router({
	getQueued: getQueuedProcedure,
	getCompleted: getCompletedProcedure,
	getLeadDetails: getLeadDetailsProcedure,

	distribute: procedure
		.input(z.object({ ProspectKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey } }) => {
			await distributeLead(ProspectKey);
			return { ProspectKey };
		}),

	redistribute: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			await supervisorRedistribute(ProspectKey, UserKey);
			return { ProspectKey };
		}),

	validateResponse: validateResponseProcedure,

	view: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1), roleType: roleTypeSchema }))
		.query(async ({ input: { ProspectKey, UserKey, roleType } }) => {
			const where = getLeadsWhere(roleType, UserKey) as Prisma.LdLeadWhereInput;

			const lead = await prisma.ldLead
				.findFirst({
					where: { ProspectKey, ...where },
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
			const upsertLead = upsertLeadFunc(ProspectKey);

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
			await upsertLead({
				log: { log: `Lead picked by "${userStr}"` },
				isPicked: true,
				call: { user: { connect: { UserKey } } }
			});

			// Complete Lead Notification Processes
			const notificationProcesses = await prisma.ldLeadNotificationProcess.findMany({
				where: {
					lead: { ProspectKey },
					status: { in: ['SCHEDULED', 'ACTIVE'] }
				}
			});
			await Promise.all(
				notificationProcesses.map(async ({ id, status }) => {
					await prisma.ldLeadNotificationProcess.update({
						where: { id },
						data: {
							status: status === 'SCHEDULED' ? 'CANCELLED' : 'COMPLETED'
						}
					});
				})
			);

			return { ProspectKey };
		}),

	complete: procedure
		.input(
			z.object({
				ProspectKey: z.string().min(1),
				UserKey: z.string().min(1),
				success: z.boolean(),
				completeStatus: z.string().min(1)
			})
		)
		.query(async ({ input: { ProspectKey, UserKey, success, completeStatus } }) => {
			// Check if Lead is Completed/Closed
			const lead = await prisma.ldLead
				.findFirst({ where: { ProspectKey }, select: { id: true } })
				.catch(prismaErrorHandler);
			if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found in queue' });

			// Update Lead Log
			await completeLead({ ProspectKey, success, completeStatus, user: { connect: { UserKey } } });
			return { ProspectKey };
		}),

	postLeadProspect: procedure
		.input(z.object({ prospect: prospectInputSchema, AccessKey: z.string().min(1) }))
		.query(async ({ input: { prospect, AccessKey } }) => {
			const url = 'https://openapi.xyzies.com/LeadProspect/PostLead';
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', AccessKey },
				body: JSON.stringify(prospect)
			});
			if (res.status !== 200) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bad Request' });
			return;
		})
});
