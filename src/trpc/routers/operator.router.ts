import { procedure, router } from '../server';

export const operatorRouter = router({
	getAll: procedure.query(async () => {
		const operators = await prisma.operator.findMany();
		return { operators };
	})
});
