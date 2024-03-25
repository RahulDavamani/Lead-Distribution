import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Args = {
	ruleId?: string;
	isPicked?: boolean;
	overrideCallback?: boolean;
	log?: Prisma.LdLeadLogCreateInput;
};

export const createLeadFunc =
	(ProspectKey: string) =>
	async ({ ruleId, log, isPicked, overrideCallback }: Args) =>
		await prisma.ldLead
			.create({
				data: {
					ProspectKey,
					ruleId,
					isPicked: isPicked ?? false,
					overrideCallback: overrideCallback ?? false,
					logs: { create: log }
				}
			})
			.catch(prismaErrorHandler);
