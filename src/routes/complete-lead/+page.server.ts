import { error } from '@sveltejs/kit';
import { completeLead } from '../../trpc/routers/lead/helpers/lead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	await completeLead({ ProspectKey, success: false, completeStatus: 'Manual Lead Management' });

	return {};
};
