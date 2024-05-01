import { prisma } from '../../../../prisma/prisma';
export interface Operator {
	UserKey: string | null;
	VonageAgentId: string | null;
	FirstName: string | null;
	LastName: string | null;
	Email: string | null;
}

export const getOperators = async () =>
	(await prisma.$queryRaw`
      select Users.UserKey, Users.FirstName, Users.LastName, Users.Email, Users.VonageAgentId
      from VonageUsers inner join Users on VonageUsers.UserId=Users.VonageAgentId
      where VonageUsers.Active=1
   `) as Operator[];
