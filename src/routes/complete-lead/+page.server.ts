import { error } from '@sveltejs/kit';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { insertLeadCompleted } from '../../trpc/routers/lead/helpers/insertLeadCompleted.js';
import { completeLead } from '../../trpc/routers/lead/helpers/completeLead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	const completedLead = await prisma.ldLeadCompleted
		.findUnique({
			where: { ProspectKey },
			select: { id: true }
		})
		.catch(prismaErrorHandler);
	if (completedLead) throw error(400, 'Lead already in completed');

	const lead = await prisma.ldLead
		.findUnique({
			where: { ProspectKey },
			select: { id: true }
		})
		.catch(prismaErrorHandler);

	if (lead) completeLead({ ProspectKey, success: false, completeStatus: 'GHL Text Received' });
	else insertLeadCompleted(ProspectKey);

	return {};
};
