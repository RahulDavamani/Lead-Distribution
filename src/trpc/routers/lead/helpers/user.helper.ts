import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const getUserValues = async (UserKey: string) =>
	await prisma.users
		.findUnique({ where: { UserKey }, select: { VonageAgentId: true, FirstName: true, LastName: true, Email: true } })
		.catch(prismaErrorHandler);

export const getUserStr = async (UserKey: string) => {
	const user = await getUserValues(UserKey);
	return user ? `${user.VonageAgentId}: ${user.FirstName} ${user.LastName}` : 'N/A';
};
