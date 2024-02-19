import { prisma } from '../../prisma/prisma';
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
			where: { Phone: { contains: From.slice(-10) } },
			select: { ProspectKey: true },
			orderBy: { CreatedOn: 'desc' }
		})
		.catch(prismaErrorHandler);

	const { rule } = await prisma.ldLead.findUniqueOrThrow({
		where: { ProspectKey },
		select: {
			rule: { select: { messagingService: true } }
		}
	});
	if (rule?.messagingService !== 'twilio') throw error(409, 'Messaging Service not supported');

	const trpc = await createCaller(event);
	await trpc.lead.validateResponse({ ProspectKey, ResponseType: 'sms', Response: Body }).catch(trpcServerErrorHandler);
	return {};
};
