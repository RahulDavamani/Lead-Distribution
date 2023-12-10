import { createCaller } from '../trpc/routers/app.router';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const x = await trpc.hello();
	console.log(x);
	return {};
};
