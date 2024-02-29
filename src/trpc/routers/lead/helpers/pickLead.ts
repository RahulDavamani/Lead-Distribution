import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getUserStr, getUserValues } from './user';
import { updateLeadFunc } from './updateLead';
import { endNotificationProcesses } from './notificationProcess';

export const pickLead = async (ProspectKey: string, UserKey: string) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const userValues = await getUserValues(UserKey);
	const userStr = await getUserStr(UserKey);

	// Check if Lead is Completed/Closed
	const lead = await prisma.ldLead
		.findUnique({
			where: { ProspectKey },
			select: { id: true, rule: { select: { isActive: true, outboundCallNumber: true } } }
		})
		.catch(prismaErrorHandler);
	if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found in queue' });

	// Rule Not Found / Inactive
	if (!lead.rule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	if (!lead.rule.isActive)
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });

	// Call Customer
	await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${userValues?.VonageAgentId},${lead.rule.outboundCallNumber}`.catch(
		prismaErrorHandler
	);

	// Update Lead
	await updateLead({
		log: { log: `Lead picked by "${userStr}"` },
		isPicked: true,
		call: { user: { connect: { UserKey } } }
	});

	// End Notification Processes
	await endNotificationProcesses(ProspectKey);
};
