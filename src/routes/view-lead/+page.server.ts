// import { error } from '@sveltejs/kit';
// import { createCaller } from '../../trpc/routers/app.router.js';
// import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';

// export const load = async (event) => {
// 	const ProspectKey = event.url.searchParams.get('ProspectKey');
// 	const UserKey = event.url.searchParams.get('UserKey');
// 	const IsSupervisor = event.url.searchParams.get('IsSupervisor') === 'true';
// 	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
// 	if (!UserKey) throw error(400, 'Bad Request: Missing params "UserKey');

// 	const trpc = await createCaller(event);
// 	const { lead, prospect } = await trpc.lead
// 		.view({ ProspectKey, UserKey: IsSupervisor ? undefined : UserKey })
// 		.catch(trpcServerErrorHandler);

// 	return { lead, prospect };
// };
