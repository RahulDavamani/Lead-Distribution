export const deleteCompletedLead = async (completedLeadId: string) => {
	const { notificationProcesses } = await prisma.ldLeadCompleted.findUniqueOrThrow({
		where: { id: completedLeadId },
		select: { notificationProcesses: { select: { id: true } } }
	});

	await Promise.all(
		notificationProcesses.map(async ({ id }) => {
			await prisma.ldLeadNotificationAttempt.deleteMany({ where: { notificationProcessId: id } });
			await prisma.ldLeadEscalation.deleteMany({ where: { notificationProcessId: id } });
		})
	);
	await prisma.ldLeadNotificationProcess.deleteMany({ where: { completedLeadId } });

	await prisma.ldLeadLog.deleteMany({ where: { completedLeadId } });
	await prisma.ldLeadMessage.deleteMany({ where: { completedLeadId } });
	await prisma.ldLeadCall.deleteMany({ where: { completedLeadId } });
	await prisma.ldLeadResponse.deleteMany({ where: { completedLeadId } });
	await prisma.ldLeadCompleted.delete({ where: { id: completedLeadId } });
};
