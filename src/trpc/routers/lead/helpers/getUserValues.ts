import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Operator } from '../../../../zod/operator.schema';

export const getUserId = async (UserKey: string) => {
	try {
		return Number(
			(
				await prisma.users
					.findFirstOrThrow({ where: { UserKey }, select: { VonageAgentId: true } })
					.catch(prismaErrorHandler)
			)?.VonageAgentId
		);
	} catch (error) {
		return undefined;
	}
};
export const getUserKey = async (UserId: number) => {
	const Email = await getUserEmail(UserId);
	try {
		return (
			await prisma.users
				.findFirstOrThrow({
					where: { Email },
					select: { UserKey: true }
				})
				.catch(prismaErrorHandler)
		)?.UserKey;
	} catch (error) {
		return undefined;
	}
};

export const getUserName = async (UserId: number) => {
	try {
		return (
			(
				(await prisma.$queryRaw`select Name from VonageUsers where UserId=${UserId} and Active=1`.catch(
					prismaErrorHandler
				)) as Operator[]
			)?.[0]?.Name ?? 'N/A'
		);
	} catch (error) {
		return undefined;
	}
};

export const getUserEmail = async (UserId: number) => {
	try {
		return (
			(
				(await prisma.$queryRaw`select Email from VonageUsers where UserId=${UserId} and Active=1`.catch(
					prismaErrorHandler
				)) as Operator[]
			)?.[0]?.Email ?? 'N/A'
		);
	} catch (error) {
		return undefined;
	}
};
