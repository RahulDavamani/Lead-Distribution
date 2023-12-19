// import { error } from 'console';
// import { createCaller } from '../../trpc/routers/app.router.js';
// import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';

// export const load = async (event) => {
// 	const isSupervisor = event.url.searchParams.get('IsSupervisor') === 'true';
// 	const UserKey = event.url.searchParams.get('UserKey');
// 	if (!UserKey) throw error(400, 'Bad Request: Missing params "UserKey');

// 	const trpc = await createCaller(event);
// 	const { queuedLeads } = await trpc.lead
// 		.getQueued({ UserKey: isSupervisor ? undefined : UserKey })
// 		.catch(trpcServerErrorHandler);
// 	const { completedLeads } = await trpc.lead
// 		.getCompleted({
// 			dateRange: [new Date(new Date().setDate(new Date().getDate() - 2)).toString(), new Date().toString()],
// 			UserKey
// 		})
// 		.catch(trpcServerErrorHandler);
// 	return { queuedLeads, completedLeads };
// };
