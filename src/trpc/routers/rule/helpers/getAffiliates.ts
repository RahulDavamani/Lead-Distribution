import { prisma } from '../../../../prisma/prisma';

export interface Affiliate {
	CompanyKey: string;
	CompanyName: string;
	rule?: {
		id: string;
		name: string;
	};
}

export interface AffiliateAccessKey {
	Value: string;
	Text: string;
}

export const getAffiliates = async () =>
	(await prisma.$queryRaw`select CompanyKey, CompanyName from v_AffilateLeadDistribution`) as Affiliate[];

export const getAffiliatesAccessKey = async () =>
	(await prisma.$queryRaw`select * from v_List_LDMS_TESTAffiliates order by Text`) as AffiliateAccessKey[];
