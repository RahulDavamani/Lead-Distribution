import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getCompanyValues = async (CompanyKey: string) =>
	await prisma.companies
		.findFirst({
			where: { CompanyKey },
			select: { CompanyName: true }
		})
		.catch(prismaErrorHandler);
