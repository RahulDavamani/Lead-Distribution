import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getCompanyKey = async (ProspectKey: string) => {
	try {
		return (
			await prisma.leadProspect
				.findFirstOrThrow({
					where: { ProspectKey },
					select: { CompanyKey: true }
				})
				.catch(prismaErrorHandler)
		).CompanyKey;
	} catch (error) {
		return undefined;
	}
};
