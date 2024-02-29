import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Args = {
	isPicked?: boolean;
	log?: Prisma.LdLeadLogCreateInput;
	message?: Prisma.LdLeadMessageCreateInput;
	call?: Prisma.LdLeadCallCreateInput;
};

export const updateLeadFunc =
	(ProspectKey: string) =>
	async ({ isPicked, log, message, call }: Args) =>
		await prisma.ldLead
			.update({
				where: { ProspectKey },
				data: {
					isPicked,
					logs: { create: log },
					messages: { create: message },
					calls: { create: call }
				}
			})
			.catch(prismaErrorHandler);
