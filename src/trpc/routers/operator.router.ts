import type { Operator } from '../../zod/operator.schema';
import { procedure, router } from '../server';

export const operatorRouter = router({
	getAll: procedure.query(async () => {
		const operators =
			(await prisma.$queryRaw`select * from VonageUsers where Active=1 and License='Agent'`) as Operator[];
		return { operators };
	})
});
