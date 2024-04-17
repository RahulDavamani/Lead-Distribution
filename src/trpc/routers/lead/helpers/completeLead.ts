import type { Prisma } from '@prisma/client';
import { getUserStr } from './user';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const completeLead = async ({
	ProspectKey,
	success,
	completeStatus,
	user
}: Prisma.LdLeadCompletedCreateInput) => {
	// Get Lead Data
	const {
		id,
		createdAt,
		ruleId,
		VonageGUID,
		CompanyKey,
		notes,
		logs,
		notificationProcesses,
		messages,
		calls,
		responses
	} = await prisma.ldLead
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

	// Delete Lead
	await prisma.ldLead.delete({ where: { ProspectKey } }).catch(prismaErrorHandler);

	// Create Completed Lead
	const UserKey = user?.connect?.UserKey ?? calls[0]?.UserKey;
	const { id: completedLeadId } = await prisma.ldLeadCompleted.create({
		data: {
			id,
			createdAt,
			ruleId,
			VonageGUID,
			CompanyKey,
			notes,
			ProspectKey,
			success,
			completeStatus,
			UserKey
		},
		select: { id: true }
	});
	await prisma.ldLeadLog.create({
		data: {
			log: user?.connect?.UserKey
				? `Lead completed by "${await getUserStr(user.connect.UserKey)}": ${completeStatus}`
				: `Lead completed: ${completeStatus}`,
			completedLeadId
		}
	});

	// Update Lead Data
	await Promise.all(
		logs.map(async ({ id }) => {
			await prisma.ldLeadLog
				.update({
					where: { id },
					data: {
						completedLead: { connect: { id: completedLeadId } },
						lead: { disconnect: true }
					}
				})
				.catch(prismaErrorHandler);
		})
	);
	await Promise.all(
		notificationProcesses.map(async ({ id, status }) => {
			await prisma.ldLeadNotificationProcess
				.update({
					where: { id },
					data: {
						completedLead: { connect: { id: completedLeadId } },
						lead: { disconnect: true },
						status: status === 'SCHEDULED' || status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED'
					}
				})
				.catch(prismaErrorHandler);
		})
	);
	await Promise.all(
		messages.map(async ({ id }) => {
			await prisma.ldLeadMessage
				.update({
					where: { id },
					data: {
						completedLead: { connect: { id: completedLeadId } },
						lead: { disconnect: true }
					}
				})
				.catch(prismaErrorHandler);
		})
	);
	await Promise.all(
		calls.map(async ({ id }) => {
			await prisma.ldLeadCall
				.update({
					where: { id },
					data: {
						completedLead: { connect: { id: completedLeadId } },
						lead: { disconnect: true }
					}
				})
				.catch(prismaErrorHandler);
		})
	);
	await Promise.all(
		responses.map(async ({ id }) => {
			await prisma.ldLeadResponse
				.update({
					where: { id },
					data: {
						completedLead: { connect: { id: completedLeadId } },
						lead: { disconnect: true },
						isCompleted: true
					}
				})
				.catch(prismaErrorHandler);
		})
	);
};
