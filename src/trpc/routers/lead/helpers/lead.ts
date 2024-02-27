import { prisma } from '../../../../prisma/prisma';
import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getUserStr } from './user';

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
	ruleId?: string;
	isPicked?: boolean;
	log?: Prisma.LdLeadLogCreateInput;
	message?: Prisma.LdLeadMessageCreateInput;
	call?: Prisma.LdLeadCallCreateInput;
};

export const upsertLeadFunc =
	(ProspectKey: string) =>
	async ({ ruleId, isPicked, log, message, call }: Args) =>
		await prisma.ldLead
			.upsert({
				where: { ProspectKey },
				create: {
					ProspectKey,
					ruleId,
					isPicked: false,
					logs: { create: log },
					messages: { create: message },
					calls: { create: call }
				},
				update: {
					isPicked,
					logs: { create: log },
					messages: { create: message },
					calls: { create: call }
				}
			})
			.catch(prismaErrorHandler);

export const completeLead = async ({
	ProspectKey,
	success,
	completeStatus,
	user
}: Prisma.LdLeadCompletedCreateInput) => {
	const upsertLead = upsertLeadFunc(ProspectKey);
	await upsertLead({
		log: {
			log: user?.connect?.UserKey
				? `Lead completed by "${await getUserStr(user.connect.UserKey)}": ${completeStatus}`
				: `Lead completed: ${completeStatus}`
		}
	});

	const { id, createdAt, ruleId, VonageGUID, logs, notificationProcesses, messages, calls, responses } =
		await prisma.ldLead
			.findUniqueOrThrow({
				where: { ProspectKey },
				include: {
					logs: { select: { id: true } },
					notificationProcesses: { select: { id: true, status: true } },
					messages: { select: { id: true } },
					calls: { orderBy: { createdAt: 'desc' }, select: { id: true, UserKey: true } },
					responses: { select: { id: true } }
				}
			})
			.catch(prismaErrorHandler);

	await prisma.ldLead.delete({ where: { ProspectKey } }).catch(prismaErrorHandler);

	const UserKey = user?.connect?.UserKey ?? calls[0]?.UserKey;
	const { id: completedLeadId } = await prisma.ldLeadCompleted.create({
		data: {
			id,
			createdAt,
			ruleId,
			VonageGUID,
			ProspectKey,
			success,
			completeStatus,
			UserKey
		},
		select: { id: true }
	});

	await Promise.all(
		logs.map(async ({ id }) => {
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
		notificationProcesses.map(async ({ id, status }) => {
			await prisma.ldLeadNotificationProcess.update({
				where: { id },
				data: {
					completedLead: { connect: { id: completedLeadId } },
					lead: { disconnect: true },
					status: status === 'SCHEDULED' || status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED'
				}
			});
		})
	);
	await Promise.all(
		messages.map(async ({ id }) => {
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
		calls.map(async ({ id }) => {
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
		responses.map(async ({ id }) => {
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
};

export const unCompleteLead = async (ProspectKey: string) => {
	const { id, createdAt, ruleId, VonageGUID, logs, notificationProcesses, messages, calls, responses } =
		await prisma.ldLeadCompleted
			.findUniqueOrThrow({
				where: { ProspectKey },
				include: {
					logs: { select: { id: true } },
					notificationProcesses: { select: { id: true } },
					messages: { select: { id: true } },
					calls: { select: { id: true } },
					responses: { select: { id: true } }
				}
			})
			.catch(prismaErrorHandler);

	const { id: leadId } = await prisma.ldLead.create({
		data: {
			id,
			createdAt,
			ruleId,
			VonageGUID,
			ProspectKey,
			isPicked: false
		},
		select: { id: true }
	});

	await Promise.all(
		logs.map(async ({ id }) => {
			await prisma.ldLeadLog.update({
				where: { id },
				data: {
					completedLead: { disconnect: true },
					lead: { connect: { id: leadId } }
				}
			});
		})
	);
	await Promise.all(
		notificationProcesses.map(async ({ id }) => {
			await prisma.ldLeadNotificationProcess.update({
				where: { id },
				data: {
					completedLead: { disconnect: true },
					lead: { connect: { id: leadId } }
				}
			});
		})
	);
	await Promise.all(
		messages.map(async ({ id }) => {
			await prisma.ldLeadMessage.update({
				where: { id },
				data: {
					completedLead: { disconnect: true },
					lead: { connect: { id: leadId } }
				}
			});
		})
	);
	await Promise.all(
		calls.map(async ({ id }) => {
			await prisma.ldLeadCall.update({
				where: { id },
				data: {
					completedLead: { disconnect: true },
					lead: { connect: { id: leadId } }
				}
			});
		})
	);
	await Promise.all(
		responses.map(async ({ id }) => {
			await prisma.ldLeadResponse.update({
				where: { id },
				data: {
					completedLead: { disconnect: true },
					lead: { connect: { id: leadId } }
				}
			});
		})
	);

	await prisma.ldLeadCompleted.delete({ where: { ProspectKey } }).catch(prismaErrorHandler);
};
