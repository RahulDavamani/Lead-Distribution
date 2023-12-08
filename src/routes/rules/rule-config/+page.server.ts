import { createCaller } from '../../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const id = event.url.searchParams.get('id');
	if (!id) return {};

	const trpc = await createCaller(event);
	const { rule } = await trpc.rule.getById({ id }).catch(trpcServerErrorHandler);

	return { rule };
};
