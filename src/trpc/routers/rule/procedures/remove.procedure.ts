import { z } from 'zod';
import { procedure } from '../../../server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

const schema = z.object({ id: z.string().min(1) });

const method = async ({ id }: z.infer<typeof schema>) => {
	await prisma.ldRule.delete({ where: { id } }).catch(prismaErrorHandler);
	return { id };
};

export const remove = {
	schema,
	method,
	procedure: procedure.input(schema).mutation(async ({ input }) => method(input))
};
