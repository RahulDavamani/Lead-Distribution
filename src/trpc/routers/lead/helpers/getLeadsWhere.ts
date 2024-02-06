import type { Prisma } from '@prisma/client';

export const getLeadsWhere = (roleType: string, UserKey?: string) => {
	let where: Prisma.LdLeadWhereInput | Prisma.LdLeadCompletedWhereInput = {};
	switch (roleType) {
		case 'ADMIN':
			where = {};
			break;

		case 'SUPERVISOR':
			where = { rule: { supervisors: { some: { UserKey } } } };
			break;

		case 'AGENT':
			where = { rule: { operators: { some: { UserKey } } } };
			break;
	}
	return where;
};
