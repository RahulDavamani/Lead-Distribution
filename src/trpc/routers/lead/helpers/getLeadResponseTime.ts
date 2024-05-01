import { getTimeElapsed } from '$lib/client/DateTime';

export const getLeadResponseTime = async (id: string) => {
	const call = await prisma.ldLeadCall.findFirst({
		where: { OR: [{ leadId: id }, { completedLeadId: id }] },
		orderBy: { createdAt: 'asc' }
	});
	if (call) {
		const notificationProcess = await prisma.ldLeadNotificationProcess.findFirst({
			where: {
				OR: [{ leadId: id }, { completedLeadId: id }],
				createdAt: { lt: call.createdAt }
			},
			orderBy: { createdAt: 'desc' },
			select: { createdAt: true }
		});
		if (notificationProcess) return getTimeElapsed(notificationProcess.createdAt, call.createdAt);
	}
};
