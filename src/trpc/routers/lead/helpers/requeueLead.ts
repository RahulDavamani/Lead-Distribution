import { TRPCError } from '@trpc/server';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getUserStr } from './user';
import { updateLeadFunc } from './updateLead';
import { dispatchNotifications } from './dispatchNotifications';
import { unCompleteLead } from './uncompleteLead';
import { endNotificationProcesses } from './notificationProcess';

export const requeueLead = async (ProspectKey: string, UserKey?: string) => {
	const updateLead = updateLeadFunc(ProspectKey);
	if (!UserKey) await unCompleteLead(ProspectKey);

	// Check if Lead is already in Queue
	const { rule, notificationProcesses } = await prisma.ldLead
		.findFirstOrThrow({
			where: { ProspectKey },
			select: {
				rule: { select: { id: true, isActive: true } },
				notificationProcesses: {
					orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
					take: 1,
					select: { callbackNum: true, requeueNum: true }
				}
			}
		})
		.catch(prismaErrorHandler);

	// Log Requeue
	const log = `Lead ${notificationProcesses.length === 0 ? 'queued' : 'requeued'} by ${UserKey ? await getUserStr(UserKey) : 'GHL'}`;
	await updateLead({ log: { log }, isPicked: false });

	// Rule Not Found / Inactive
	if (!rule) {
		await updateLead({ log: { log: `Rule not found` } });
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead Distribution Rule not found' });
	}
	if (!rule.isActive) {
		await updateLead({ log: { log: `Rule is inactive` } });
		throw new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Lead Distribution Rule is Inactive' });
	}

	// End Notification Processes
	await endNotificationProcesses(ProspectKey);

	// Send Notification to Operators
	const [callbackNum, requeueNum] =
		notificationProcesses.length === 0
			? [0, 0]
			: [notificationProcesses[0].callbackNum, notificationProcesses[0].requeueNum + 1];

	await dispatchNotifications(ProspectKey, callbackNum, requeueNum);
};
