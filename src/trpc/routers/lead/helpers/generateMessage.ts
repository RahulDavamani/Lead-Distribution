import { prisma } from '../../../../prisma/prisma';
import { getTimeElapsedText } from '$lib/client/DateTime';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';

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
	let lead = await prisma.ldLead
		.findUnique({
			where: { ProspectKey },
			select: { createdAt: true, rule: { select: { name: true, outboundCallNumber: true } } }
		})
		.catch(prismaErrorHandler);

	if (!lead) {
		lead = await prisma.ldLeadCompleted
			.findUnique({
				where: { ProspectKey },
				select: { createdAt: true, rule: { select: { name: true, outboundCallNumber: true } } }
			})
			.catch(prismaErrorHandler);
	}
	if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
	const { rule, createdAt } = lead;

	const timeElapsed = createdAt ? getTimeElapsedText(createdAt, new Date()) : '';

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
