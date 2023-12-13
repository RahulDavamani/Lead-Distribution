import type { ServerLoadEvent } from '@sveltejs/kit';
import { createContext, procedure, router } from '../server';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { ruleRouter } from './rule.router';
import { operatorRouter } from './operator.router';
import { affiliateRouter } from './affiliate.router';

// userKey 74bedd5f-c117-474c-90d5-5a13eedd068f

export const appRouter = router({
	test: procedure.query(async () => {
		// const result = await prisma.$queryRaw`select * from VonageUsers where Active=1 and License='Agent'`;
		const result = await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
		@Title = 'Alert',
		@Message = 'This is a Alert!',
		@UserKeys = '74bedd5f-c117-474c-90d5-5a13eedd068f',
		@ExpireInSeconds = 600,
		@HrefURL = 'https://www.google.co.in/',
		@ActionBtnTitle = 'Action Button';`;

		return result;
	}),
	rule: ruleRouter,
	operator: operatorRouter,
	affiliate: affiliateRouter
});

export type AppRouter = typeof appRouter;

export const createCaller = async (event: ServerLoadEvent) => appRouter.createCaller(await createContext(event));

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
