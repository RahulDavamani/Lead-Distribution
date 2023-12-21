import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const generateNotificationMessage = async (ProspectKey: string, textTemplate: string) => {
	// Get Prospect
	const prospect = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				CustomerFirstName: true,
				CustomerLastName: true,
				Email: true,
				Address: true,
				ZipCode: true
			}
		})
		.catch(prismaErrorHandler);

	// Generate Message
	let message = textTemplate;
	message = message.replace(/%CustomerFirstName/g, prospect.CustomerFirstName || '');
	message = message.replace(/%CustomerLastName/g, prospect.CustomerLastName || '');
	message = message.replace(/%Email/g, prospect.Email || '');
	message = message.replace(/%Address/g, prospect.Address || '');
	message = message.replace(/%ZipCode/g, prospect.ZipCode || '');

	return message;
};
