import { getCompanyKey } from './getCompanyKey';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';

export const insertLeadCompleted = async (ProspectKey: string) => {
	// Find Rule for CompanyKey
	const CompanyKey = await getCompanyKey(ProspectKey);
	const rule = CompanyKey
		? await prisma.ldRule
				.findFirst({
					where: { affiliates: { some: { CompanyKey } } },
					select: { id: true, isActive: true },
					orderBy: { createdAt: 'desc' }
				})
				.catch(prismaErrorHandler)
		: undefined;

	// Create Completed Lead
	await prisma.ldLeadCompleted
		.create({
			data: {
				ProspectKey,
				ruleId: rule?.id,
				success: true,
				completeStatus: 'Completed Lead from GHL',
				logs: {
					create: { log: 'Lead completed: Completed Lead from GHL' }
				}
			}
		})
		.catch(prismaErrorHandler);
};
