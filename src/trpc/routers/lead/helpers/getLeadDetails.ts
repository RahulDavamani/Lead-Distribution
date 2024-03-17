import { actionsInclude } from '$lib/config/actions/actions.config';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getProcessName } from './notificationProcess';
import { getUserValues } from './user';

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

	const notificationAttempts = [];
	for (const notificationAttempt of lead.notificationProcesses.flatMap(
		({ notificationAttempts }) => notificationAttempts
	)) {
		notificationAttempts.push({
			...notificationAttempt,
			userValues: notificationAttempt.UserKey ? await getUserValues(notificationAttempt.UserKey) : undefined
		});
	}

	const escalations = [];
	for (const escalation of lead.notificationProcesses.flatMap(({ escalations }) => escalations)) {
		escalations.push({
			...escalation,
			userValues: escalation.UserKey ? await getUserValues(escalation.UserKey) : undefined
		});
	}

	const notificationProcesses = [];
	for (const notificationProcess of lead.notificationProcesses) {
		const notificationAttempts = [];
		for (const notificationAttempt of notificationProcess.notificationAttempts)
			notificationAttempts.push({
				...notificationAttempt,
				userValues: notificationAttempt.UserKey ? await getUserValues(notificationAttempt.UserKey) : undefined
			});

		const escalations = [];
		for (const escalation of notificationProcess.escalations)
			escalations.push({
				...escalation,
				userValues: escalation.UserKey ? await getUserValues(escalation.UserKey) : undefined
			});

		notificationProcesses.push({
			...notificationProcess,
			processName: getProcessName(notificationProcess.callbackNum, notificationProcess.requeueNum),
			notificationAttempts,
			escalations
		});
	}

	const calls = [];
	for (const call of lead.calls)
		calls.push({
			...call,
			userValues: call?.UserKey ? await getUserValues(call.UserKey) : undefined
		});

	return { ...lead, ProspectId, calls, notificationProcesses };
};
