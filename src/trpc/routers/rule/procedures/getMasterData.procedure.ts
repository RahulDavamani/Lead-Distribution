import { z } from 'zod';
import { procedure } from '../../../server';
import { getAffiliates } from '../helpers/getAffiliates';
import { getOperators } from '../helpers/getOperators';
import { getCompanies } from '../helpers/getCompanies';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

const schema = z.undefined();

const method = async (_?: z.infer<typeof schema>) => {
	const affiliates = await getAffiliates();
	const companies = await getCompanies();
	const operators = await getOperators();

	const ruleAffiliates = await Promise.all(
		affiliates.map(async (a) => {
			const ruleAffiliate = await prisma.ldRuleAffiliate
				.findFirst({
					where: { CompanyKey: a.CompanyKey },
					select: { rule: { select: { id: true, name: true } } }
				})
				.catch(prismaErrorHandler);
			return { ...a, rule: ruleAffiliate?.rule };
		})
	);
	return { affiliates: ruleAffiliates, companies, operators };
};

export const getMasterData = {
	schema,
	method,
	procedure: procedure.input(schema).query(async ({ input }) => method(input))
};
