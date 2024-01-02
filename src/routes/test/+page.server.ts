import { createCaller } from '../../trpc/routers/app.router';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const result = await trpc.test.test();
	return { result };
};
