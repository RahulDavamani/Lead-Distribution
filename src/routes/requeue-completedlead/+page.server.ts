import { error } from '@sveltejs/kit';
import { completedRedistribute } from '../../trpc/routers/lead/helpers/distributeLead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	await completedRedistribute(ProspectKey);

	return {};
};
