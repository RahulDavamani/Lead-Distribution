import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router';

export const load = async (event) => {
	const Guid = event.url.searchParams.get('Guid');
	if (!Guid) throw error(400, 'Bad Request: Missing params "Guid"');

	const trpc = await createCaller(event);
	const { vonageCall, audioUrl } = await trpc.vonageCall.get({ Guid });
	return { vonageCall, audioUrl };
};
