import { endNotificationProcesses } from './notificationProcess';

export const deleteLeads = async (ids: string[], isCompleted: boolean) => {
	let leads;
	if (isCompleted)
		leads = await prisma.ldLeadCompleted.findMany({
			where: { id: { in: ids } },
			select: { ProspectKey: true, notificationProcesses: { select: { id: true } } }
		});
	else
		leads = await prisma.ldLead.findMany({
			where: { id: { in: ids } },
			select: { ProspectKey: true, notificationProcesses: { select: { id: true } } }
		});

	await Promise.all(leads.map(({ ProspectKey }) => endNotificationProcesses(ProspectKey)));
	const notificationProcessesIds = leads.flatMap(({ notificationProcesses }) =>
		notificationProcesses.flatMap(({ id }) => id)
	);

	await prisma.ldLeadNotificationAttempt.deleteMany({
		where: { notificationProcessId: { in: notificationProcessesIds } }
	});
	await prisma.ldLeadEscalation.deleteMany({
		where: { notificationProcessId: { in: notificationProcessesIds } }
	});

	let where;
	if (isCompleted) where = { completedLeadId: { in: ids } };
	else where = { leadId: { in: ids } };

	await prisma.ldLeadNotificationProcess.deleteMany({ where });
	await prisma.ldLeadLog.deleteMany({ where });
	await prisma.ldLeadMessage.deleteMany({ where });
	await prisma.ldLeadCall.deleteMany({ where });
	await prisma.ldLeadResponse.deleteMany({ where });

	if (isCompleted) await prisma.ldLeadCompleted.deleteMany({ where: { id: { in: ids } } });
	else await prisma.ldLead.deleteMany({ where: { id: { in: ids } } });
};
