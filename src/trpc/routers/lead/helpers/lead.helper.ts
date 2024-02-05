import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const createLead = async (ProspectKey: string, ruleId?: string) =>
	await prisma.ldLead
		.create({
			data: {
				ProspectKey,
				ruleId,
				isPicked: false
			}
		})
		.catch(prismaErrorHandler);

type Args = {
	isPicked?: boolean;
	log?: Prisma.LdLeadLogCreateInput;
	message?: Prisma.LdLeadMessageCreateInput;
	call?: Prisma.LdLeadCallCreateInput;
};

export const updateLeadFunc = (ProspectKey: string) => async (args: Args) =>
	await prisma.ldLead
		.update({
			where: { ProspectKey },
			data: {
				isPicked: args.isPicked,
				logs: args.log ? { create: args.log } : undefined,
				messages: args.message ? { create: args.message } : undefined,
				calls: args.call ? { create: args.call } : undefined
			}
		})
		.catch(prismaErrorHandler);

export const createLeadNotificationQueue = async (queueType: string, ProspectKey: string) => {
	const { id } = await prisma.ldLeadNotificationsQueue.create({
		data: {
			lead: { connect: { ProspectKey } },
			type: queueType,
			isCompleted: false
		},
		select: { id: true }
	});

	const addNotificationAttempt = async (
		notificationAttempt: Prisma.LdLeadNotificationAttemptCreateWithoutNotificationQueueInput
	) =>
		await prisma.ldLeadNotificationsQueue.update({
			where: { id },
			data: { notificationAttempts: { create: notificationAttempt } }
		});

	const checkLeadNotificationQueueCompleted = async () =>
		(
			await prisma.ldLeadNotificationsQueue
				.findUnique({ where: { id, lead: { ProspectKey } }, select: { isCompleted: true } })
				.catch(prismaErrorHandler)
		)?.isCompleted ?? true;

	const completeLeadNotificationQueue = async () => {
		await prisma.ldLeadNotificationsQueue
			.update({
				where: { id },
				data: { isCompleted: true }
			})
			.catch(prismaErrorHandler);
	};

	return {
		notificationQueueId: id,
		addNotificationAttempt,
		checkLeadNotificationQueueCompleted,
		completeLeadNotificationQueue
	};
};

export const completeLead = async (ProspectKey: string, closeStatus?: string) => {
	const lead = await prisma.ldLead
		.findUniqueOrThrow({
			where: { ProspectKey },
			include: {
				logs: { select: { id: true } },
				notificationQueues: { select: { id: true } },
				messages: { select: { id: true } },
				calls: { select: { id: true } },
				responses: { select: { id: true } }
			}
		})
		.catch(prismaErrorHandler);

	const { id: completedLeadId } = await prisma.ldLeadCompleted.create({
		data: {
			id: lead.id,
			createdAt: lead.createdAt,
			VonageGUID: lead.VonageGUID,
			ProspectKey,
			state: closeStatus ? 'CLOSED' : 'COMPLETED',
			closeStatus,
			ruleId: lead?.ruleId
		}
	});

	await Promise.all(
		lead.logs.map(async ({ id }) => {
			await prisma.ldLeadLog.update({
				where: { id },
				data: {
					completedLead: { connect: { id: completedLeadId } },
					lead: { disconnect: true }
				}
			});
		})
	);
	await Promise.all(
		lead.notificationQueues.map(async ({ id }) => {
			await prisma.ldLeadNotificationsQueue.update({
				where: { id },
				data: {
					completedLead: { connect: { id: completedLeadId } },
					lead: { disconnect: true },
					isCompleted: true
				}
			});
		})
	);
	await Promise.all(
		lead.messages.map(async ({ id }) => {
			await prisma.ldLeadMessage.update({
				where: { id },
				data: {
					completedLead: { connect: { id: completedLeadId } },
					lead: { disconnect: true }
				}
			});
		})
	);
	await Promise.all(
		lead.calls.map(async ({ id }) => {
			await prisma.ldLeadCall.update({
				where: { id },
				data: {
					completedLead: { connect: { id: completedLeadId } },
					lead: { disconnect: true }
				}
			});
		})
	);
	await Promise.all(
		lead.responses.map(async ({ id }) => {
			await prisma.ldLeadResponse.update({
				where: { id },
				data: {
					completedLead: { connect: { id: completedLeadId } },
					lead: { disconnect: true },
					isCompleted: true
				}
			});
		})
	);
	console.log(await prisma.ldLead.findUnique({ where: { ProspectKey }, select: { _count: true } }));
	await prisma.ldLead.delete({ where: { ProspectKey } }).catch(prismaErrorHandler);
};

export const createLeadResponse = async (ProspectKey: string, response: Prisma.LdLeadResponseCreateInput) => {
	const { id } = await prisma.ldLeadResponse.create({
		data: {
			...response,
			lead: { connect: { ProspectKey } }
		},
		select: { id: true }
	});

	const completeLeadResponse = async () => {
		await prisma.ldLeadResponse
			.update({
				where: { id },
				data: { isCompleted: true }
			})
			.catch(prismaErrorHandler);
	};

	return {
		responseId: id,
		completeLeadResponse
	};
};
