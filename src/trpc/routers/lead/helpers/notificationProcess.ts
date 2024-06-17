import { prisma } from '../../../../prisma/prisma';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { updateLeadFunc } from './updateLead';
import { getProcessName } from '$lib/getProcessName';

export const startNotificationProcess = async (ProspectKey: string, callbackNum: number, requeueNum: number) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const name = getProcessName(callbackNum, requeueNum);

	// Cancel all active/scheduled processes
	await endNotificationProcesses(ProspectKey);

	// update Notification Process
	let process = await prisma.ldLeadNotificationProcess.findFirst({
		where: { lead: { ProspectKey }, callbackNum, requeueNum },
		select: { id: true }
	});
	if (process) {
		await prisma.ldLeadNotificationProcess.update({
			where: { id: process.id },
			data: { status: 'ACTIVE' }
		});
	} else {
		process = await prisma.ldLeadNotificationProcess.create({
			data: {
				lead: { connect: { ProspectKey } },
				callbackNum,
				requeueNum,
				status: 'ACTIVE'
			},
			select: { id: true }
		});
	}
	const { id } = process;

	await updateLead({
		log: { log: `${name}: Sending notifications` },
		isPicked: false
	});

	// Methods
	const isCompleted = async () =>
		(
			await prisma.ldLeadNotificationProcess
				.findUnique({ where: { id, lead: { ProspectKey } }, select: { status: true } })
				.catch(prismaErrorHandler)
		)?.status !== 'ACTIVE';

	const completeProcess = async () => {
		await updateLead({ log: { log: `${name}: Completed Sending notifications` } });
		await prisma.ldLeadNotificationProcess
			.update({
				where: { id },
				data: { status: 'COMPLETED' }
			})
			.catch(prismaErrorHandler);
	};

	return { id, name, isCompleted, completeProcess };
};

export const continueNotificationProcess = async (ProspectKey: string) => {
	const updateLead = updateLeadFunc(ProspectKey);

	const process = await prisma.ldLeadNotificationProcess.findFirstOrThrow({
		orderBy: { createdAt: 'desc' },
		where: { lead: { ProspectKey } },
		select: {
			id: true,
			callbackNum: true,
			requeueNum: true,
			notificationAttempts: {
				select: {
					attempt: { select: { id: true, num: true } },
					UserKey: true
				}
			},
			escalations: {
				select: {
					escalation: { select: { id: true, num: true } },
					UserKey: true
				}
			}
		}
	});

	const name = getProcessName(process.callbackNum, process.requeueNum);

	// Methods
	const isCompleted = async () =>
		(
			await prisma.ldLeadNotificationProcess
				.findUnique({ where: { id: process.id, lead: { ProspectKey } }, select: { status: true } })
				.catch(prismaErrorHandler)
		)?.status !== 'ACTIVE';

	const completeProcess = async () => {
		await updateLead({ log: { log: `${name}: Completed Sending notifications` } });
		await prisma.ldLeadNotificationProcess
			.update({
				where: { id: process.id },
				data: { status: 'COMPLETED' }
			})
			.catch(prismaErrorHandler);
	};

	return { ...process, name, isCompleted, completeProcess };
};

export const endNotificationProcesses = async (ProspectKey: string) => {
	const notificationProcesses = await prisma.ldLeadNotificationProcess.findMany({
		where: {
			lead: { ProspectKey },
			OR: [{ status: { in: ['SCHEDULED', 'ACTIVE'] } }, { completedAt: null }]
		},
		select: { id: true, status: true, completedAt: true }
	});

	await Promise.all(
		notificationProcesses.map(async ({ id, status, completedAt }) => {
			await prisma.ldLeadNotificationProcess.update({
				where: { id },
				data: {
					status: status === 'SCHEDULED' ? 'CANCELLED' : status === 'ACTIVE' ? 'COMPLETED' : status,
					completedAt: completedAt ?? new Date()
				}
			});
		})
	);
};
