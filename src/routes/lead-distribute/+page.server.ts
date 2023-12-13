import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const id = event.url.searchParams.get('prospectKey');
	if (!id) throw error(400, 'Bad Request: Missing params "prospectKey"');

	await trpc.lead.distribute({ prospectKey: id });

	return {};
};
