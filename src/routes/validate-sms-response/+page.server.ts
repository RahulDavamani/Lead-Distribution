import { error } from '@sveltejs/kit';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';
import { createCaller } from '../../trpc/routers/app.router';
import { trpcServerErrorHandler } from '../../trpc/trpcErrorhandler';

export const load = async (event) => {
	const From = event.url.searchParams.get('From');
	const Body = event.url.searchParams.get('Body');
	console.log(From, Body);
	if (!From) throw error(400, 'Bad Request: Missing params "From"');
	if (!Body) throw error(400, 'Bad Request: Missing params "Body"');

	const { ProspectKey } = await prisma.leadProspect
		.findFirstOrThrow({
			where: { Phone: From },
			select: { ProspectKey: true },
			orderBy: { CreatedOn: 'desc' }
		})
		.catch(prismaErrorHandler);

	const trpc = await createCaller(event);
	await trpc.lead.validateResponse({ ProspectKey, ResponseType: 'sms', Response: Body }).catch(trpcServerErrorHandler);
	return {};
};
