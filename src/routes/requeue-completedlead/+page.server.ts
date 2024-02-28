import { error } from '@sveltejs/kit';
import { requeueLead } from '../../trpc/routers/lead/helpers/requeueLead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	await requeueLead(ProspectKey);
	return {};
};
