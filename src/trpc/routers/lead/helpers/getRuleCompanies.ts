import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getCompanyValues } from './company';
import { getUserValues } from './user';

export const getRuleCompanies = async (ruleId: string) => {
	const operators = await prisma.ldRuleOperator
		.findMany({
			where: { ruleId },
			select: { UserKey: true }
		})
		.catch(prismaErrorHandler);

	const companies: { CompanyKey: string; CompanyName: string }[] = [];
	for (const { UserKey } of operators) {
		const CompanyKey = (await getUserValues(UserKey))?.CompanyKey;
		if (CompanyKey && companies.find((c) => c.CompanyKey === CompanyKey) === undefined) {
			const CompanyName = CompanyKey && (await getCompanyValues(CompanyKey))?.CompanyName;
			CompanyName && companies.push({ CompanyKey, CompanyName });
		}
	}

	return companies;
};
