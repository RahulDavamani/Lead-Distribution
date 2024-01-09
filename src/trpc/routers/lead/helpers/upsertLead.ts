import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Args = {
	ruleId?: string;
	isDistribute?: boolean;
	isCall?: boolean;
	isCompleted?: boolean;
	UserId?: number;
	closeStatus?: string;
};

export const upsertLead = async (ProspectKey: string, status: string, args?: Args) => {
	const lead = await prisma.ldLead
		.upsert({
			where: { ProspectKey },
			create: {
				ProspectKey,
				status,
				ruleId: args?.ruleId ?? null,
				isDistribute: args?.isDistribute ?? false,
				isCall: args?.isCall ?? false,
				isCompleted: args?.isCompleted ?? false,
				closeStatus: args?.closeStatus ?? null
			},
			update: { status, ...args }
		})
		.catch(prismaErrorHandler);

	await prisma.$queryRaw`exec [p_GHL_UpdateProspectContact] ${ProspectKey},3,${status}`;
	await prisma.ldLeadHistory.create({ data: { leadId: lead.id, status } }).catch(prismaErrorHandler);
	return lead;
};
