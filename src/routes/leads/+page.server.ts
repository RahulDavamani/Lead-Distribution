import { get } from 'svelte/store';
import { createCaller } from '../../trpc/routers/app.router.js';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';
import { auth } from '../../stores/auth.store.js';

export const load = async (event) => {
	const isSupervisor = auth.isSupervisor();
	const UserKey = isSupervisor ? undefined : get(auth).user?.UserKey ?? '';

	const trpc = await createCaller(event);
	const { queuedLeads } = await trpc.lead.getQueued({ UserKey }).catch(trpcServerErrorHandler);
	const { completedLeads } = await trpc.lead
		.getCompleted({
			dateRange: [new Date(new Date().setDate(new Date().getDate() - 2)).toString(), new Date().toString()],
			UserKey
		})
		.catch(trpcServerErrorHandler);
	return { queuedLeads, completedLeads };
};
