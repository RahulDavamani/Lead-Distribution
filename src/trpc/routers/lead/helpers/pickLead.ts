import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getUserStr, getUserValues } from './user';
import { updateLeadFunc } from './updateLead';
import { endNotificationProcesses } from './notificationProcess';
import { calculateLeadDuration } from '$lib/client/DateTime';
import { getWorkingHours } from './getWorkingHours';

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
				CompanyKey: true,
				leadResponseTime: true,
				rule: { select: { id: true, isActive: true, outboundCallNumber: true, overrideOutboundNumber: true } },
				notificationProcesses: {
					select: { id: true, createdAt: true },
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

	// Get Outbound Number
	let outboundCallNumber = lead.rule.outboundCallNumber;
	if (lead.rule.overrideOutboundNumber) {
		const prospect = await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey },
				select: { OutBoundNumber: true }
			})
			.catch(prismaErrorHandler);
		if (prospect.OutBoundNumber) outboundCallNumber = prospect.OutBoundNumber;
	}

	// Call Customer
	await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] ${ProspectKey},${userValues?.VonageAgentId},${outboundCallNumber}`.catch(
		prismaErrorHandler
	);

	// Lead Response Time
	let leadResponseTime = lead.leadResponseTime;
	if (!leadResponseTime) {
		const workingHours = await getWorkingHours(lead.rule.id, lead.CompanyKey);
		const notificationProcess = lead.notificationProcesses.find((np) => np.createdAt < new Date());
		leadResponseTime = notificationProcess
			? calculateLeadDuration(notificationProcess.createdAt, new Date(), workingHours)
			: null;
	}

	// Update Lead
	await updateLead({
		log: { log: `Lead picked by "${userStr}"` },
		isPicked: true,
		CompanyKey: userValues?.CompanyKey,
		leadResponseTime,
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
