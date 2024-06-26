import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { updateLeadFunc } from './updateLead';

type Args = {
	ruleId?: string;
	isPicked?: boolean;
	overrideCallback?: boolean;
	log?: Prisma.LdLeadLogCreateInput;
};

export const createLeadFunc =
	(ProspectKey: string) =>
	async ({ ruleId, log, isPicked, overrideCallback }: Args) => {
		await prisma.ldLead
			.create({
				data: {
					isUpdated: true,
					ProspectKey,
					ruleId,
					notes: '',
					isPicked: isPicked ?? false,
					overrideCallback: overrideCallback ?? false,
					logs: { create: log }
				}
			})
			.catch(prismaErrorHandler);

		await updateLeadFunc(ProspectKey)({});
	};
