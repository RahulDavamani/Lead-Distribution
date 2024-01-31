import type { Affiliate } from '../../../../zod/affiliate.schema';

export const getAffiliates = async () =>
	(await prisma.$queryRaw`select CompanyKey, CompanyName from v_AffilateLeadDistribution`) as Affiliate[];
