import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	const UserId = event.url.searchParams.get('UserId');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
	if (!UserId) throw error(400, 'Bad Request: Missing params "UserId"');

	const trpc = await createCaller(event);
	const { lead, prospect } = await trpc.lead.view({ ProspectKey });

	return { lead, prospect, UserId };
};
