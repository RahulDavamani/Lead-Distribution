import { getTimeElapsedText } from '$lib/client/DateTime';
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

	// Get Rule
	const { name, outboundCallNumber } = await prisma.ldRule.findFirstOrThrow({
		where: { affiliates: { some: { CompanyKey: CompanyKey ?? '' } } },
		select: { name: true, outboundCallNumber: true }
	});

	// Get Lead
	const { createdAt } = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			select: { createdAt: true }
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
		.replaceAll('{{RuleName}}', name ?? '')
		.replaceAll('{{OutboundCallNumber}}', outboundCallNumber ?? '')
		.replaceAll('{{LeadCreatedOn}}', createdAt.toLocaleString() ?? '')
		.replaceAll('{{LeadTimeElapsed}}', timeElapsed ?? '');

	return message;
};
