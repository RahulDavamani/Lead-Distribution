import type { ServerLoadEvent } from '@sveltejs/kit';
import { createContext, router } from '../server';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { ruleRouter } from './rule.router';
import { operatorRouter } from './operator.router';
import { affiliateRouter } from './affiliate.router';
import { leadRouter } from './lead/lead.router';
import { vonageCallRouter } from './vonageCall.router';
import { testRouter } from './test.router';

// Davamani@yopmail userKey 74bedd5f-c117-474c-90d5-5a13eedd068f
// rahul@xyzies userKey c3a81c29-a0f1-4470-8a70-73d3866d30e9

export const appRouter = router({
	test: testRouter,
	rule: ruleRouter,
	operator: operatorRouter,
	affiliate: affiliateRouter,
	lead: leadRouter,
	vonageCall: vonageCallRouter
});

export type AppRouter = typeof appRouter;

export const createCaller = async (event: ServerLoadEvent) => appRouter.createCaller(await createContext(event));

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
