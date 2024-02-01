import { error } from '@sveltejs/kit';
import { createCaller } from '../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
	const Disposition = event.url.searchParams.get('Disposition');
	if (!Disposition) throw error(400, 'Bad Request: Missing params "Disposition"');

	const trpc = await createCaller(event);
	await trpc.lead
		.validateResponse({ ProspectKey, ResponseType: 'disposition', Response: Disposition })
		.catch(trpcServerErrorHandler);

	return {};
};
