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
			select: {
				id: true,
				rule: { select: { isActive: true, outboundCallNumber: true } },
				notificationProcesses: {
					select: { id: true },
					orderBy: { createdAt: 'desc' },
					take: 1
				}
			}
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
		CompanyKey: userValues?.CompanyKey,
		call: { user: { connect: { UserKey } } }
	});

	// Complete Notification Process
	if (lead.notificationProcesses.length > 0)
		await prisma.ldLeadNotificationProcess
			.update({
				where: { id: lead.notificationProcesses[0].id },
				data: {
					status: 'COMPLETED',
					completedAt: new Date()
				}
			})
			.catch(prismaErrorHandler);

	// End Notification Processes
	await endNotificationProcesses(ProspectKey);
};
