import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

const schema = z.undefined();

const method = async (_?: z.infer<typeof schema>) => {
	const rules = await prisma.ldRule
		.findMany({
			include: { _count: true },
			orderBy: { createdAt: 'desc' }
		})
		.catch(prismaErrorHandler);
	return { rules };
};

export const getAll = {
	schema,
	method,
	procedure: procedure.input(schema).query(async ({ input }) => method(input))
};
