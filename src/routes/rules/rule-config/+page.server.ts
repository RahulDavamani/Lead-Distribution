import { createCaller } from '../../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const trpc = await createCaller(event);

	const id = event.url.searchParams.get('id');
	const { ...data } = await trpc.rule.getById({ id }).catch(trpcServerErrorHandler);

	return { ...data };
};
