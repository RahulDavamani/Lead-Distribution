import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router.js';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';
import { get } from 'svelte/store';
import { auth } from '../../stores/auth.store.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	const $auth = get(auth);
	let UserKey;
	if ($auth.isAuth) {
		UserKey = auth.isSupervisor() ? undefined : $auth.user?.UserKey;
	} else {
		UserKey = event.url.searchParams.get('UserKey');
		if (!UserKey) throw error(404, 'Lead not found / Forbidden');
	}

	const trpc = await createCaller(event);
	const { UserId, lead, prospect } = await trpc.lead.view({ ProspectKey, UserKey }).catch(trpcServerErrorHandler);

	return { UserId, lead, prospect };
};
