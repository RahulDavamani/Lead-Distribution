import { prisma } from '../../../../prisma/prisma';
import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { updateLeadFunc } from './updateLead';

export const createLeadResponse = async (ProspectKey: string, response: Prisma.LdLeadResponseCreateInput) => {
	const updateLead = updateLeadFunc(ProspectKey);
	const { id } = await prisma.ldLeadResponse.create({
		data: { ...response, lead: { connect: { ProspectKey } } },
		select: { id: true }
	});
	await updateLead({});

	const completeLeadResponse = async () => {
		await prisma.ldLeadResponse
			.update({
				where: { id },
				data: { isCompleted: true }
			})
			.catch(prismaErrorHandler);
		await updateLead({});
	};

	return {
		responseId: id,
		completeLeadResponse
	};
};
