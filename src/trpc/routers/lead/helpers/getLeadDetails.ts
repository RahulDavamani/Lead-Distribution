import { actionsInclude } from '$lib/config/actions/actions.config';
import { getProcessName } from '$lib/getProcessName';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getLeadDetails = async (id: string, type: 'queued' | 'completed') => {
	let lead;
	if (type === 'queued')
		lead = await prisma.ldLead
			.findUniqueOrThrow({
				where: { id },
				select: {
					ProspectKey: true,
					logs: { orderBy: { createdAt: 'asc' } },
					notificationProcesses: {
						orderBy: [{ callbackNum: 'asc' }, { requeueNum: 'asc' }],
						include: {
							notificationAttempts: { orderBy: { createdAt: 'asc' } },
							escalations: { orderBy: { createdAt: 'asc' } }
						}
					},
					messages: { orderBy: { createdAt: 'asc' }, include: { messageResponse: true } },
					calls: { orderBy: { createdAt: 'asc' } },
					responses: { orderBy: { createdAt: 'asc' }, include: { actions: actionsInclude } }
				}
			})
			.catch(prismaErrorHandler);
	else
		lead = await prisma.ldLeadCompleted
			.findUniqueOrThrow({
				where: { id },
				select: {
					ProspectKey: true,
					logs: { orderBy: { createdAt: 'asc' } },
					notificationProcesses: {
						orderBy: { createdAt: 'asc' },
						include: {
							notificationAttempts: { orderBy: { createdAt: 'asc' } },
							escalations: { orderBy: { createdAt: 'asc' } }
						}
					},
					messages: { orderBy: { createdAt: 'asc' }, include: { messageResponse: true } },
					calls: { orderBy: { createdAt: 'asc' } },
					responses: { orderBy: { createdAt: 'asc' }, include: { actions: actionsInclude } }
				}
			})
			.catch(prismaErrorHandler);

	const { ProspectId } = await prisma.leadProspect
		.findFirstOrThrow({
			where: { ProspectKey: lead.ProspectKey },
			select: { ProspectId: true }
		})
		.catch(prismaErrorHandler);

	const UserKeys = lead.notificationProcesses
		.flatMap((np) => np.notificationAttempts.map((na) => na.UserKey).concat(np.escalations.map((e) => e.UserKey)))
		.concat(lead.calls.map((c) => c.UserKey))
		.filter(Boolean) as string[];

	const users = await prisma.users.findMany({
		where: { UserKey: { in: UserKeys } },
		select: {
			UserKey: true,
			VonageAgentId: true,
			FirstName: true,
			LastName: true
		}
	});

	const notificationProcesses = lead.notificationProcesses.map((notificationProcess) => {
		const notificationAttempts = notificationProcess.notificationAttempts.map((notificationAttempt) => ({
			...notificationAttempt,
			userValues: users.find((u) => u.UserKey === notificationAttempt.UserKey)
		}));

		const escalations = notificationProcess.escalations.map((escalation) => ({
			...escalation,
			userValues: users.find((u) => u.UserKey === escalation.UserKey)
		}));

		return {
			...notificationProcess,
			processName: getProcessName(notificationProcess.callbackNum, notificationProcess.requeueNum),
			notificationAttempts,
			escalations
		};
	});

	const calls = lead.calls.map((call) => ({
		...call,
		userValues: users.find((u) => u.UserKey === call.UserKey)
	}));

	return { ...lead, ProspectId, calls, notificationProcesses };
};
