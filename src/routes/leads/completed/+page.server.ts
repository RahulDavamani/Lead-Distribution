import { createCaller } from '../../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const { leads } = await trpc.lead.getCompletedLeads().catch(trpcServerErrorHandler);
	return { leads };
};
