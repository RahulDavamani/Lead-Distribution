import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { actionsInclude } from '$lib/config/actions/actions.config';
import type { Rule } from '../../../../zod/rule.schema';

const schema = z.object({ id: z.string().min(1) });

const method = async ({ id }: z.infer<typeof schema>) => {
	const { _count, ...rule } = (await prisma.ldRule
		.findUniqueOrThrow({
			where: { id },
			include: {
				affiliates: { orderBy: { num: 'asc' } },
				companies: { orderBy: { CompanyKey: 'asc' }, include: { workingHours: true } },
				operators: { orderBy: { num: 'asc' } },
				supervisors: { orderBy: { num: 'asc' } },
				notificationAttempts: { orderBy: { num: 'asc' } },
				escalations: { orderBy: { num: 'asc' } },
				responses: { include: { actions: actionsInclude }, orderBy: { num: 'asc' } },
				responseOptions: {
					include: {
						responsesLimitExceedActions: actionsInclude,
						responsesNoMatchActions: actionsInclude
					}
				},
				_count: { select: { queuedLeads: true, completedLeads: true } }
			}
		})
		.catch(prismaErrorHandler)) as Rule & { _count: { queuedLeads: number; completedLeads: number } };
	return { rule, canDelete: _count.queuedLeads + _count.completedLeads === 0 };
};

export const getById = {
	schema,
	method,
	procedure: procedure.input(schema).query(async ({ input }) => await method(input))
};
