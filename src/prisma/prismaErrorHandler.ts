import * as trpc from '@trpc/server';
import { Prisma } from '@prisma/client';
import { getErrorCode } from '../lib/data/errorCodes';

const prismaErrorHandler = (e: unknown) => {
	console.log(e);
	if (e instanceof Prisma.PrismaClientKnownRequestError)
		throw new trpc.TRPCError({
			code: getErrorCode({ prisma: e.code })?.trpc ?? 'INTERNAL_SERVER_ERROR',
			message: `Database Error ${e.code}: ${e.message}`
		});
	throw new trpc.TRPCError({
		code: 'INTERNAL_SERVER_ERROR',
		message: `Database Error`
	});
};

export default prismaErrorHandler;
