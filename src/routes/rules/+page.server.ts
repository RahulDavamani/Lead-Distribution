import { createCaller } from '../../trpc/routers/app.router.js';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler.js';

export const load = async (event) => {
	const trpc = await createCaller(event);
	const data = await trpc.rule.getAll().catch(trpcServerErrorHandler);
	return data;
};
