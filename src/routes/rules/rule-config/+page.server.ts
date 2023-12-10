import { createCaller } from '../../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const trpc = await createCaller(event);

	const { operators } = await trpc.operator.getAll().catch(trpcServerErrorHandler);
	const { affiliates } = await trpc.affiliate.getAll().catch(trpcServerErrorHandler);

	const id = event.url.searchParams.get('id');
	let rule;
	if (!id) rule = null;
	else rule = (await trpc.rule.getById({ id }).catch(trpcServerErrorHandler)).rule;

	return { rule, operators, affiliates };
};
