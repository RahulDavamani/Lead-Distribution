import { error } from '@sveltejs/kit';
import { insertLead } from '../../trpc/routers/lead/helpers/insertLead';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	await insertLead(ProspectKey);
	return {};
};
