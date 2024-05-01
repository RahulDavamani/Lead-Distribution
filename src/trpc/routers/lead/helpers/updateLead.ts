import type { Prisma } from '@prisma/client';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

type Args = {
	isPicked?: boolean;
	overrideCallback?: boolean;
	CompanyKey?: string | null;
	leadResponseTime?: number | null;
	log?: Prisma.LdLeadLogCreateInput;
	message?: Prisma.LdLeadMessageCreateInput;
	call?: Prisma.LdLeadCallCreateInput;
	response?: Prisma.LdLeadResponseCreateInput;
};

export const updateLeadFunc =
	(ProspectKey: string) =>
	async ({ isPicked, overrideCallback, CompanyKey, leadResponseTime, log, message, call, response }: Args) =>
		await prisma.ldLead
			.update({
				where: { ProspectKey },
				data: {
					isPicked,
					overrideCallback,
					CompanyKey,
					leadResponseTime,
					logs: { create: log },
					messages: { create: message },
					calls: { create: call },
					responses: { create: response }
				}
			})
			.catch(prismaErrorHandler);
