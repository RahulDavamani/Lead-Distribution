import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const prospectKey = event.url.searchParams.get('prospectKey');
	if (!prospectKey) throw error(400, 'Bad Request: Missing params "prospectKey"');

	const trpc = await createCaller(event);
	await trpc.lead.distribute({ prospectKey }).catch(trpcServerErrorHandler);

	return {};
};
