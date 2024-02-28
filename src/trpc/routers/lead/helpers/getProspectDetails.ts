import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import type { Affiliate } from '../../../../zod/affiliate.schema';

export const getProspectDetails = async (ProspectKey: string) => {
	try {
		const { ProspectId, CompanyKey, CustomerFirstName, CustomerLastName, Address, ZipCode } = await prisma.leadProspect
			.findFirstOrThrow({
				where: { ProspectKey },
				select: {
					ProspectId: true,
					CompanyKey: true,
					CustomerFirstName: true,
					CustomerLastName: true,
					Address: true,
					ZipCode: true
				}
			})
			.catch(prismaErrorHandler);

		let CompanyName;
		try {
			CompanyName = (
				(CompanyKey
					? await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${CompanyKey}`.catch(
							prismaErrorHandler
						)
					: []) as (Affiliate | undefined)[]
			)[0]?.CompanyName;
		} catch (error) {
			CompanyName = undefined;
		}

		return {
			ProspectId: ProspectId,
			CustomerName: `${CustomerFirstName ?? ''} ${CustomerLastName ?? ''}`,
			CustomerAddress: `${Address ?? ''} ${ZipCode ?? ''}`,
			CompanyName
		};
	} catch (error) {
		return undefined;
	}
};
