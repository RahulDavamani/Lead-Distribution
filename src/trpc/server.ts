import { initTRPC, TRPCError } from '@trpc/server';
import type { RequestEvent } from '@sveltejs/kit';

export async function createContext({ locals: { session } }: RequestEvent) {
	return { session };
}

export const t = initTRPC.context<typeof createContext>().create();
export const { router, procedure, middleware } = t;

const isAuth = middleware(({ ctx: { session }, next }) => {
	if (!session) throw new TRPCError({ code: 'FORBIDDEN' });
	return next({ ctx: { session } });
});
export const authProcedure = procedure.use(isAuth);
