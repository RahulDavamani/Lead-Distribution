import { error } from '@sveltejs/kit';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { insertLeadCompleted } from '../../trpc/routers/lead/helpers/insertLeadCompleted.js';
import { completeLead } from '../../trpc/routers/lead/helpers/completeLead.js';

export const load = async (event) => {
	const ProspectKey = event.url.searchParams.get('ProspectKey');
	if (!ProspectKey) throw error(400, 'Bad Request: Missing params "ProspectKey"');

	const lead = await prisma.ldLead
		.findUnique({
			where: { ProspectKey },
			select: { id: true }
		})
		.catch(prismaErrorHandler);

	if (lead) await completeLead({ ProspectKey, success: false, completeStatus: 'GHL Text Received' });
	else await insertLeadCompleted(ProspectKey);

	return {};
};
