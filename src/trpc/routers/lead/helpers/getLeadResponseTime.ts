import { getTimeElapsed } from '$lib/client/DateTime';

export const getLeadResponseTime = async (id: string) => {
	const call = await prisma.ldLeadCall.findFirst({
		where: { OR: [{ leadId: id }, { completedLeadId: id }] },
		orderBy: { createdAt: 'asc' }
	});
	const notificationProcesses = await prisma.ldLeadNotificationProcess.findMany({
		where: { OR: [{ leadId: id }, { completedLeadId: id }] },
		orderBy: { createdAt: 'desc' },
		select: { createdAt: true }
	});
	const np = call
		? notificationProcesses.find(({ createdAt }) => createdAt < call.createdAt)
		: notificationProcesses[0];
	return np ? getTimeElapsed(np.createdAt, call?.createdAt ?? new Date()) : undefined;
};
