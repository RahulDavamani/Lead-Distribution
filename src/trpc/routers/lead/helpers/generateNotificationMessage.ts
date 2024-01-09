import { getTimeElapsedText } from '$lib/client/DateTime';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const generateNotificationMessage = async (ProspectKey: string, textTemplate: string) => {
	// Get Prospect
	const { CustomerFirstName, CustomerLastName, Email, Address, ZipCode } = await prisma.leadProspect
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

	// Get Rule

	// Get Lead
	const { createdAt, rule } = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			select: { createdAt: true, rule: { select: { name: true, outboundCallNumber: true } } }
		})
		.catch(prismaErrorHandler);

	const timeElapsed = getTimeElapsedText(createdAt, new Date());

	// Generate Message
	const message = textTemplate
		.replaceAll('{{CustomerFirstName}}', CustomerFirstName ?? '')
		.replaceAll('{{CustomerLastName}}', CustomerLastName ?? '')
		.replaceAll('{{Email}}', Email ?? '')
		.replaceAll('{{Address}}', Address ?? '')
		.replaceAll('{{ZipCode}}', ZipCode ?? '')
		.replaceAll('{{RuleName}}', rule?.name ?? '')
		.replaceAll('{{OutboundCallNumber}}', rule?.outboundCallNumber ?? '')
		.replaceAll('{{LeadCreatedOn}}', createdAt.toLocaleString() ?? '')
		.replaceAll('{{LeadTimeElapsed}}', timeElapsed ?? '');

	return message;
};
