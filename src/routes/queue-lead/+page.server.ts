import { error } from '@sveltejs/kit';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { requeueLead } from '../../trpc/routers/lead/helpers/requeueLead.js';
import { insertLead } from '../../trpc/routers/lead/helpers/insertLead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	const lead = await prisma.ldLead
		.findUnique({
			where: { ProspectKey },
			select: { id: true }
		})
		.catch(prismaErrorHandler);
	if (lead) throw error(400, 'Lead already in Queue');

	const completeLead = await prisma.ldLeadCompleted
		.findUnique({
			where: { ProspectKey },
			select: { id: true }
		})
		.catch(prismaErrorHandler);

	if (completeLead) await requeueLead(ProspectKey);
	else insertLead(ProspectKey);

	return {};
};
