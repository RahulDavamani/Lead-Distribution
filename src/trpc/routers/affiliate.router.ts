import type { Affiliate } from '../../zod/affiliate.schema';
import { procedure, router } from '../server';

export const affiliateRouter = router({
	getAll: procedure.query(async () => {
		const affiliates = (await prisma.$queryRaw`select * from v_AffilateLeadDistribution`) as Affiliate[];
		return { affiliates };
	})
});
