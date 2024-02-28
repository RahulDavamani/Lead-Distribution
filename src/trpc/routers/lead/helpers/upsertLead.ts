import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Args = {
	ruleId?: string;
	isPicked?: boolean;
	log?: Prisma.LdLeadLogCreateInput;
	message?: Prisma.LdLeadMessageCreateInput;
	call?: Prisma.LdLeadCallCreateInput;
};

export const upsertLeadFunc =
	(ProspectKey: string) =>
	async ({ ruleId, isPicked, log, message, call }: Args) =>
		await prisma.ldLead
			.upsert({
				where: { ProspectKey },
				create: {
					ProspectKey,
					ruleId,
					isPicked: false,
					logs: { create: log },
					messages: { create: message },
					calls: { create: call }
				},
				update: {
					isPicked,
					logs: { create: log },
					messages: { create: message },
					calls: { create: call }
				}
			})
			.catch(prismaErrorHandler);
