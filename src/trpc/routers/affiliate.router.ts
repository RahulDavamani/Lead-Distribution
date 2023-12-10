import { procedure, router } from '../server';

export const affiliateRouter = router({
	getAll: procedure.query(async () => {
		const affiliates = await prisma.affiliate.findMany();
		return { affiliates };
	})
});
