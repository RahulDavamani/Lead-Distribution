import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const upsertLead = async (
	ProspectKey: string,
	status: string,
	isProgress: boolean = true,
	isCompleted: boolean = false,
	UserId?: number
) => {
	const lead = await prisma.ldLead
		.upsert({
			where: { ProspectKey },
			create: { ProspectKey, status, isProgress, isCompleted, UserId },
			update: { ProspectKey, status, isProgress, isCompleted, UserId }
		})
		.catch(prismaErrorHandler);

	await prisma.$queryRaw`exec [p_GHL_UpdateProspectContact] ${ProspectKey},3,${status}`;
	await prisma.ldLeadHistory.create({ data: { leadId: lead.id, status } }).catch(prismaErrorHandler);
	return lead;
};
