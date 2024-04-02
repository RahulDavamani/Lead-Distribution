import { z } from 'zod';
import { procedure, router } from '../../server';
import { TRPCError } from '@trpc/server';
import { prisma } from '../../../prisma/prisma';
import prismaErrorHandler from '../../../prisma/prismaErrorHandler';
import { prospectInputSchema } from '../../../zod/prospectInput.schema';
import { roleTypeSchema } from '../../../stores/auth.store';
import type { Prisma } from '@prisma/client';
import { getLeadsWhere } from './helpers/getLeadsWhere';
import { requeueLead } from './helpers/requeueLead';
import { pickLead } from './helpers/pickLead';
import { completeLead } from './helpers/completeLead';
import { getLeadDetails } from './helpers/getLeadDetails';
import { getQueuedLeads } from './helpers/getQueuedLeads';
import { getCompletedLeads } from './helpers/getCompletedLeads';
import { deleteLeads } from './helpers/deleteLeads';
import { getRuleCompanies } from './helpers/getRuleCompanies';

export const leadRouter = router({
	getQueued: procedure
		.input(z.object({ UserKey: z.string().min(1), roleType: roleTypeSchema }))
		.query(async ({ input: { UserKey, roleType } }) => await getQueuedLeads(UserKey, roleType)),

	getCompleted: procedure
		.input(
			z.object({
				dateRange: z.array(z.string()).length(2),
				UserKey: z.string().min(1),
				roleType: roleTypeSchema
			})
		)
		.query(
			async ({ input: { dateRange, UserKey, roleType } }) => await getCompletedLeads(UserKey, roleType, dateRange)
		),

	getLeadDetails: procedure
		.input(z.object({ id: z.string().min(1), type: z.enum(['queued', 'completed']) }))
		.query(async ({ input: { id, type } }) => await getLeadDetails(id, type)),

	getRuleCompanies: procedure
		.input(z.object({ ruleId: z.string().min(1) }))
		.query(async ({ input: { ruleId } }) => await getRuleCompanies(ruleId)),

	updateCompany: procedure
		.input(z.object({ id: z.string().min(1), CompanyKey: z.string().min(1).nullable() }))
		.query(async ({ input: { id, CompanyKey } }) => {
			await prisma.ldLead.update({
				where: { id },
				data: { CompanyKey }
			});
		}),

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

	requeue: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			await requeueLead(ProspectKey, UserKey);
			return { ProspectKey };
		}),

	pick: procedure
		.input(z.object({ ProspectKey: z.string().min(1), UserKey: z.string().min(1) }))
		.query(async ({ input: { ProspectKey, UserKey } }) => {
			await pickLead(ProspectKey, UserKey);
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
			await completeLead({ ProspectKey, success, completeStatus, user: { connect: { UserKey } } });
			return { ProspectKey };
		}),

	delete: procedure
		.input(z.object({ ids: z.array(z.string().min(1)), isCompleted: z.boolean() }))
		.query(async ({ input: { ids, isCompleted } }) => await deleteLeads(ids, isCompleted)),

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
		})
});
