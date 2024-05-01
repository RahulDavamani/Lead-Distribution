import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getRuleCompanies = async (ruleId: string) => {
	const operators = await prisma.ldRuleOperator
		.findMany({
			where: { ruleId },
			select: { UserKey: true }
		})
		.catch(prismaErrorHandler);

	const users = await prisma.users
		.findMany({
			where: { UserKey: { in: operators.map((operator) => operator.UserKey) } },
			select: { UserKey: true, CompanyKey: true }
		})
		.catch(prismaErrorHandler);

	return await prisma.companies
		.findMany({
			where: { CompanyKey: { in: users.map((user) => user.CompanyKey) } },
			select: { CompanyKey: true, CompanyName: true }
		})
		.catch(prismaErrorHandler);
};
