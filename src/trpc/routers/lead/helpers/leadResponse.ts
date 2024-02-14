import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

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
