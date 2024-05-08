import { z } from 'zod';
import { procedure } from '../../../server';
import { ruleSchema } from '../../../../zod/rule.schema';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

const schema = z.object({ ruleId: z.string().min(1), operators: ruleSchema.shape.operators });

const method = async ({ ruleId, operators }: z.infer<typeof schema>) => {
	for (const { UserKey, ...values } of operators) {
		await prisma.ldRuleOperator
			.update({
				where: { ruleId_UserKey: { ruleId, UserKey } },
				data: values
			})
			.catch(prismaErrorHandler);
	}
	return {};
};

export const updateOperators = {
	schema,
	method,
	procedure: procedure.input(schema).mutation(async ({ input }) => method(input))
};
