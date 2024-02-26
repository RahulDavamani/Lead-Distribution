import { prisma } from '../../../../prisma/prisma';
import { getTimeElapsedText } from '$lib/client/DateTime';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Variables = { [key: string]: string };

export const generateMessage = async (ProspectKey: string, textTemplate: string, variables?: Variables) => {
	// Get Prospect
	const { CustomerFirstName, CustomerLastName, Email, Phone, Address, ZipCode, RefId } = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				CompanyKey: true,
				CustomerFirstName: true,
				CustomerLastName: true,
				Email: true,
				Phone: true,
				Address: true,
				ZipCode: true,
				RefId: true
			}
		})
		.catch(prismaErrorHandler);

	// Get Lead
	const { createdAt, rule } = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			select: { createdAt: true, rule: { select: { name: true, outboundCallNumber: true } } }
		})
		.catch(prismaErrorHandler);

	const timeElapsed = getTimeElapsedText(createdAt, new Date());

	const allVariables: Variables = {
		CustomerFirstName: CustomerFirstName ?? '',
		CustomerLastName: CustomerLastName ?? '',
		Email: Email ?? '',
		Phone: Phone ?? '',
		Address: Address ?? '',
		ZipCode: ZipCode ?? '',
		LeadReferenceId: RefId ?? '',
		RuleName: rule?.name ?? '',
		OutboundCallNumber: rule?.outboundCallNumber ?? '',
		LeadCreatedOn: createdAt.toLocaleString() ?? '',
		LeadTimeElapsed: timeElapsed ?? '',
		...variables
	};

	// Generate Message
	let message = textTemplate;
	for (const [key, value] of Object.entries(allVariables ?? {})) message = message.replaceAll(`{{${key}}}`, value);

	return message;
};
