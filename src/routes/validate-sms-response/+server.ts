export const GET = async (event) => {
	console.log('Triggered');
	console.log(event);
	const json = await event.request.json();
	console.log(json);
	return new Response();
};

export const POST = async (event) => {
	console.log('Triggered');
	console.log(event);
	const json = await event.request.json();
	console.log(json);
	return new Response();
};
