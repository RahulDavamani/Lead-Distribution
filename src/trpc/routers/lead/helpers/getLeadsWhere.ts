import type { Prisma } from '@prisma/client';
import { getUserValues } from './user';

export const getLeadsWhere = async (roleType: string, UserKey?: string) => {
	let where: Prisma.LdLeadWhereInput | Prisma.LdLeadCompletedWhereInput = {};
	const CompanyKey = UserKey ? (await getUserValues(UserKey))?.CompanyKey : null;
	switch (roleType) {
		case 'ADMIN':
			where = {};
			break;

		case 'SUPERVISOR':
			where = { rule: { supervisors: { some: { UserKey } } } };
			break;

		case 'AGENT':
			where = {
				rule: { operators: { some: { UserKey } } },
				OR: [{ CompanyKey }, { CompanyKey: null }]
			};
			break;
	}
	return where;
};
