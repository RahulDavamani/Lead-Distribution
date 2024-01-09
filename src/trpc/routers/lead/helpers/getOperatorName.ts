import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Operator } from '../../../../zod/operator.schema';

export const getUserName = async (UserId: number) =>
	(
		(await prisma.$queryRaw`select Name from VonageUsers where UserId=${UserId}`.catch(
			prismaErrorHandler
		)) as Operator[]
	)[0].Name;
