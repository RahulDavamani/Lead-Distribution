import { createCaller } from '../../trpc/routers/app.router.js';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const { queuedLeads } = await trpc.lead.getQueued().catch(trpcServerErrorHandler);
	const { completedLeads } = await trpc.lead
		.getCompleted({
			dateRange: [new Date(new Date().setDate(new Date().getDate() - 2)).toString(), new Date().toString()]
		})
		.catch(trpcServerErrorHandler);
	return { queuedLeads, completedLeads };
};
