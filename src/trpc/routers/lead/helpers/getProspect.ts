import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getProspect = async (ProspectKey: string) => {
	const prospect = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				ProspectId: true,
				CompanyKey: true,
				CustomerFirstName: true,
				CustomerLastName: true,
				Address: true,
				ZipCode: true
			}
		})
		.catch(prismaErrorHandler);

	const company = prospect.CompanyKey
		? ((await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${prospect.CompanyKey}`) as {
				CompanyName: string;
			}[])
		: undefined;

	return { ...prospect, CompanyName: company?.[0].CompanyName };
};
