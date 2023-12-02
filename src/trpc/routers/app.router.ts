import type { ServerLoadEvent } from '@sveltejs/kit';
import { createContext, procedure, router } from '../server';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export const appRouter = router({
	hello: procedure.query(async () => 'hello')
});

export type AppRouter = typeof appRouter;

export const createCaller = async (event: ServerLoadEvent) => appRouter.createCaller(await createContext(event));

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
