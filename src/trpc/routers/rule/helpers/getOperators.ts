import type { Operator } from '../../../../zod/operator.schema';

export const getOperators = async () =>
	(await prisma.$queryRaw`
select Users.UserKey, Users.FirstName, Users.LastName, Users.Email, Users.VonageAgentId
from VonageUsers inner join Users on VonageUsers.UserId=Users.VonageAgentId
where VonageUsers.Active=1
`) as Operator[];
