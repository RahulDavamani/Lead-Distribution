import type { RequestEvent } from '@sveltejs/kit';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

export async function createContext(event: RequestEvent) {
	return { event };
}

export const t = initTRPC.context<typeof createContext>().create({ transformer: superjson });
export const { router, procedure, middleware } = t;
