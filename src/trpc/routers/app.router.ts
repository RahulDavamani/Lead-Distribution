import type { ServerLoadEvent } from '@sveltejs/kit';
import { createContext, procedure, router } from '../server';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { ruleRouter } from './rule.router';
import { operatorRouter } from './operator.router';
import { affiliateRouter } from './affiliate.router';
import { leadRouter } from './lead.router';

// userKey 74bedd5f-c117-474c-90d5-5a13eedd068f

export const appRouter = router({
	test: procedure.query(async () => {
		const result =
			await prisma.$queryRaw`select top 10 * from LeadProspect where CompanyKey='a3f77572-65ff-4534-9d48-9b44ba95d62f'`;
		// const result = await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
		// @Title = 'Alert',
		// @Message = 'This is a Alert!',
		// @UserKeys = '5A36AA41-73E1-44F7-B71B-F5BCEEAFF626',
		// @ExpireInSeconds = 600,
		// @HrefURL = 'https://www.google.co.in/',
		// @ActionBtnTitle = 'Action Button';`;

		return result;
	}),
	rule: ruleRouter,
	operator: operatorRouter,
	affiliate: affiliateRouter,
	lead: leadRouter
});

export type AppRouter = typeof appRouter;

export const createCaller = async (event: ServerLoadEvent) => appRouter.createCaller(await createContext(event));

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
