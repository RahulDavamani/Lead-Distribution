import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const unCompleteLead = async (ProspectKey: string) => {
	// Get Completed Lead Data
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

	// Create Lead
	const { id: leadId } = await prisma.ldLead.create({
		data: {
			id,
			createdAt,
			ruleId,
			VonageGUID,
			ProspectKey,
			isPicked: false,
			overrideCallback: false
		},
		select: { id: true }
	});

	// Update Lead Data
	await Promise.all(
		logs.map(async ({ id }) => {
			await prisma.ldLeadLog
				.update({
					where: { id },
					data: {
						lead: { connect: { id: leadId } },
						completedLead: { disconnect: true }
					}
				})
				.catch(prismaErrorHandler);
		})
	);
	await Promise.all(
		notificationProcesses.map(async ({ id }) => {
			await prisma.ldLeadNotificationProcess
				.update({
					where: { id },
					data: {
						lead: { connect: { id: leadId } },
						completedLead: { disconnect: true }
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
						lead: { connect: { id: leadId } },
						completedLead: { disconnect: true }
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
						lead: { connect: { id: leadId } },
						completedLead: { disconnect: true }
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
						lead: { connect: { id: leadId } },
						completedLead: { disconnect: true }
					}
				})
				.catch(prismaErrorHandler);
		})
	);

	// Delete Completed Lead
	await prisma.ldLeadCompleted.delete({ where: { ProspectKey } }).catch(prismaErrorHandler);
};
