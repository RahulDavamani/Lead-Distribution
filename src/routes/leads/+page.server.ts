import { createCaller } from '../../trpc/routers/app.router.js';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const { queuedLeads, completedLeads } = await trpc.lead.getAll().catch(trpcServerErrorHandler);
	return { queuedLeads, completedLeads };
};
