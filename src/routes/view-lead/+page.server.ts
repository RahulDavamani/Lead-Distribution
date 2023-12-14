import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router.js';

export const load = async (event) => {
	const prospectKey = event.url.searchParams.get('prospectKey');
	const UserId = event.url.searchParams.get('UserId');
	if (!prospectKey) throw error(400, 'Bad Request: Missing params "prospectKey"');
	if (!UserId) throw error(400, 'Bad Request: Missing params "UserId"');

	const trpc = await createCaller(event);
	const { lead, prospect } = await trpc.lead.view({ prospectKey });

	return { lead, prospect, UserId };
};
