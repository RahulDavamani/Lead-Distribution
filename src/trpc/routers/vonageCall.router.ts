import { z } from 'zod';
import { procedure, router } from '../server';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';
import azureGenerateSasUrl from '$lib/server/generateAzureSasUrl';

export const vonageCallRouter = router({
	get: procedure.input(z.object({ Guid: z.string().min(1) })).query(async ({ input: { Guid } }) => {
		const vonageCalls = (await prisma.$queryRaw`Select * from VonageCalls where Guid=${Guid}`.catch(
			prismaErrorHandler
		)) as { JsonText: string | null }[];
		if (vonageCalls.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vonage Call not found' });

		const sasUrls = await azureGenerateSasUrl([Guid]);

		return { vonageCall: vonageCalls[0], audioUrl: sasUrls?.[0] };
	})
});
