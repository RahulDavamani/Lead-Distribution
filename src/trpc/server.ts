import type { RequestEvent } from '@sveltejs/kit';
import { initTRPC } from '@trpc/server';

export async function createContext(event: RequestEvent) {
	return { event };
}

export const t = initTRPC.context<typeof createContext>().create();
export const { router, procedure, middleware } = t;
