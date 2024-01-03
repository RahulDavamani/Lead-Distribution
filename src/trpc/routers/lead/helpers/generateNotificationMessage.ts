import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const generateNotificationMessage = async (ProspectKey: string, textTemplate: string) => {
	// Get Prospect
	const { CompanyKey, CustomerFirstName, CustomerLastName, Email, Address, ZipCode } = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				CompanyKey: true,
				CustomerFirstName: true,
				CustomerLastName: true,
				Email: true,
				Address: true,
				ZipCode: true
			}
		})
		.catch(prismaErrorHandler);

	const { outboundCallNumber } = await prisma.ldRule
		.findFirstOrThrow({
			where: { affiliates: { some: { CompanyKey: CompanyKey ?? '' } } },
			select: { outboundCallNumber: true }
		})
		.catch(prismaErrorHandler);

	// Generate Message
	const message = textTemplate
		.replaceAll('{{CustomerFirstName}}', CustomerFirstName ?? '')
		.replaceAll('{{CustomerLastName}}', CustomerLastName ?? '')
		.replaceAll('{{Email}}', Email ?? '')
		.replaceAll('{{Address}}', Address ?? '')
		.replaceAll('{{ZipCode}}', ZipCode ?? '')
		.replaceAll('{{OutboundCallNumber}}', outboundCallNumber ?? '');

	return message;
};
