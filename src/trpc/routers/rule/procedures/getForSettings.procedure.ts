import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Prisma } from '@prisma/client';
import { roleTypeSchema } from '../../../../stores/auth.store';

const schema = z.object({ UserKey: z.string().min(1), roleType: roleTypeSchema });

const method = async ({ UserKey, roleType }: z.infer<typeof schema>) => {
	let where: Prisma.LdRuleWhereInput;
	switch (roleType) {
		case 'ADMIN':
			where = {};
			break;

		case 'SUPERVISOR':
			where = { supervisors: { some: { UserKey } } };
			break;

		case 'AGENT':
			where = { id: '' };
			break;
	}

	const rules = await prisma.ldRule
		.findMany({
			where,
			select: {
				id: true,
				name: true,
				operators: {
					select: {
						id: true,
						UserKey: true,
						num: true,
						assignNewLeads: true,
						assignCallbackLeads: true,
						user: { select: { VonageAgentId: true, FirstName: true, LastName: true, Email: true } }
					}
				}
			}
		})
		.catch(prismaErrorHandler);
	return { rules };
};

export const getForSettings = {
	schema,
	method,
	procedure: procedure.input(schema).query(async ({ input }) => method(input))
};
