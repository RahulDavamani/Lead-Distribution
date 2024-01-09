import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getUserId = async (UserKey?: string) =>
	UserKey
		? Number(
				(
					await prisma.users
						.findFirst({ where: { UserKey }, select: { VonageAgentId: true } })
						.catch(prismaErrorHandler)
				)?.VonageAgentId
		  )
		: undefined;
