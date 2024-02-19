import { prisma } from '../../../../prisma/prisma';
import type { Affiliate } from '../../../../zod/affiliate.schema';

export const getAffiliates = async () =>
	(await prisma.$queryRaw`select CompanyKey, CompanyName from v_AffilateLeadDistribution`) as Affiliate[];

export const getAffiliatesAccessKey = async () =>
	(await prisma.$queryRaw`select * from v_List_LDMS_TESTAffiliates order by Text`) as {
		Value: string;
		Text: string;
	}[];
