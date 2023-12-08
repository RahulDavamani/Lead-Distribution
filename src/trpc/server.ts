import { initTRPC } from '@trpc/server';

export async function createContext() {
	return {};
}

export const t = initTRPC.context<typeof createContext>().create();
export const { router, procedure, middleware } = t;
