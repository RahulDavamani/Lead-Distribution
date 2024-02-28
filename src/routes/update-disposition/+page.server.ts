import { error } from '@sveltejs/kit';
import { validateResponse } from '../../trpc/routers/lead/helpers/validateResponse';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');
	const Disposition = event.url.searchParams.get('Disposition');
	if (!Disposition) throw error(400, 'Bad Request: Missing params "Disposition"');

	await validateResponse(ProspectKey, 'disposition', Disposition);

	return {};
};
