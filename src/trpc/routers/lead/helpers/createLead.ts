import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Args = {
	ruleId?: string;
	log?: Prisma.LdLeadLogCreateInput;
};

export const createLeadFunc =
	(ProspectKey: string) =>
	async ({ ruleId, log }: Args) =>
		await prisma.ldLead
			.create({
				data: {
					ProspectKey,
					ruleId,
					isPicked: false,
					logs: { create: log }
				}
			})
			.catch(prismaErrorHandler);
