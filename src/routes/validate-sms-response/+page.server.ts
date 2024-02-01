import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	console.log('Triggered');
	console.log(event);
	const json = await event.request.json();
	console.log(json);
	return {};
}) satisfies PageServerLoad;
