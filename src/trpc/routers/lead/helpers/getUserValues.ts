import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Operator } from '../../../../zod/operator.schema';

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

export const getUserKey = async (UserId: number) => {
	const Email = await getUserEmail(UserId);
	return (
		await prisma.users
			.findFirstOrThrow({
				where: { Email },
				select: { UserKey: true }
			})
			.catch(prismaErrorHandler)
	)?.UserKey;
};

export const getUserName = async (UserId: number) =>
	(
		(await prisma.$queryRaw`select Name from VonageUsers where UserId=${UserId} and Active=1`.catch(
			prismaErrorHandler
		)) as Operator[]
	)?.[0]?.Name ?? 'N/A';

export const getUserEmail = async (UserId: number) =>
	(
		(await prisma.$queryRaw`select Email from VonageUsers where UserId=${UserId} and Active=1`.catch(
			prismaErrorHandler
		)) as Operator[]
	)?.[0]?.Email ?? 'N/A';
