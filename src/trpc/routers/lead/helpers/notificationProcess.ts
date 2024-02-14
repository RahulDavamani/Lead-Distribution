import type { Prisma } from '@prisma/client';
import { upsertLeadFunc } from './lead';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getUserStr } from './user';

export const startNotificationProcess = async (ProspectKey: string, callbackNum: number, requeueNum: number) => {
	const name = getProcessName(callbackNum, requeueNum);
	const upsertLead = upsertLeadFunc(ProspectKey);

	// Upsert Notification Process
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

	await prisma.ldLeadNotificationProcess.updateMany({
		where: {
			lead: { ProspectKey },
			id: { not: id },
			status: { in: ['ACTIVE', 'SCHEDULED'] },
			OR: [{ callbackNum: { lt: callbackNum } }, { callbackNum: callbackNum, requeueNum: { lt: requeueNum } }]
		},
		data: { status: 'CANCELLED' }
	});

	await upsertLead({
		log: { log: `${name}: Sending notifications` },
		isPicked: false
	});

	// Methods
	const addNotificationAttempt = async (
		num: number,
		notificationAttempt: Prisma.LdLeadNotificationAttemptCreateWithoutNotificationProcessInput
	) => {
		const userStr = await getUserStr(notificationAttempt.user?.connect?.UserKey ?? '');
		await upsertLead({
			log: { log: `${name}: Attempt #${num} sent to operator "${userStr}"` }
		});
		await prisma.ldLeadNotificationProcess.update({
			where: { id },
			data: { notificationAttempts: { create: notificationAttempt } }
		});
	};

	const addEscalation = async (
		num: number,
		escalation: Prisma.LdLeadEscalationCreateWithoutNotificationProcessInput
	) => {
		const userStr = await getUserStr(escalation.user?.connect?.UserKey ?? '');
		await upsertLead({ log: { log: `${name}: Escalation #${num} to supervisor "${userStr}"` } });
		await prisma.ldLeadNotificationProcess.update({
			where: { id },
			data: { escalations: { create: escalation } }
		});
	};

	const isCompleted = async () =>
		(
			await prisma.ldLeadNotificationProcess
				.findUnique({ where: { id, lead: { ProspectKey } }, select: { status: true } })
				.catch(prismaErrorHandler)
		)?.status !== 'ACTIVE';

	const completeProcess = async () => {
		await prisma.ldLeadNotificationProcess
			.update({
				where: { id },
				data: { status: 'COMPLETED' }
			})
			.catch(prismaErrorHandler);
	};

	return {
		id,
		name,
		addNotificationAttempt,
		addEscalation,
		isCompleted,
		completeProcess
	};
};

export const getProcessName = (callbackNum: number, requeueNum: number) => {
	let name = callbackNum === 0 ? `NEW LEAD` : `CALLBACK #${callbackNum}`;
	if (requeueNum > 0) name += ` REQUEUE #${requeueNum}`;
	return name;
};
export const getProcessNameSplit = (callbackNum: number, requeueNum: number) => {
	const processName = callbackNum === 0 ? `New Lead` : `Callback #${callbackNum}`;
	const requeueName = requeueNum > 0 ? `Requeue #${requeueNum}` : '';
	return [processName, requeueName];
};
