import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getCompanyKey = async (ProspectKey: string) =>
	(
		await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey },
				select: { CompanyKey: true }
			})
			.catch(prismaErrorHandler)
	).CompanyKey;
