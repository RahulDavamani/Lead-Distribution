import { error } from '@sveltejs/kit';
import { completeLead } from '../../trpc/routers/lead/helpers/lead.js';
import prismaErrorHandler from '../../prisma/prismaErrorHandler.js';
import { getCompanyKey } from '../../trpc/routers/lead/helpers/getCompanyKey.js';

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
	else {
		const CompanyKey = await getCompanyKey(ProspectKey);
		if (!CompanyKey) throw error(404, 'CompanyKey not found');
		const rule = await prisma.ldRule
			.findFirst({
				where: { affiliates: { some: { CompanyKey } } },
				select: {
					id: true
				},
				orderBy: { createdAt: 'desc' }
			})
			.catch(prismaErrorHandler);
		if (!rule) throw error(404, 'Rule not found');

		await prisma.ldLeadCompleted.create({
			data: {
				ProspectKey,
				ruleId: rule.id,
				success: true,
				completeStatus: 'Completed Lead from GHL',
				logs: {
					create: { log: 'Lead completed: Completed Lead from GHL' }
				}
			}
		});
	}

	return {};
};
