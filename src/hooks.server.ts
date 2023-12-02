import type { Handle } from '@sveltejs/kit';
import { createContext } from './trpc/server';
import { createTRPCHandle } from 'trpc-sveltekit';
import { appRouter } from './trpc/routers/app.router';

export const handle: Handle = async ({ event, resolve }) => {
	const trpcResolve = () => createTRPCHandle({ router: appRouter, createContext })({ event, resolve });

	return trpcResolve();
};
