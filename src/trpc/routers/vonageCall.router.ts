import { z } from 'zod';
import { procedure, router } from '../server';
import { prisma } from '../../prisma/prisma';
import prismaErrorHandler from '../../prisma/prismaErrorHandler';
import { TRPCError } from '@trpc/server';
import azureGenerateSasUrl from '$lib/server/generateAzureSasUrl';

export interface VonageCall {
	JsonText: string | null;
	Status: string | null;
	Direction: string | null;
	ConnectFrom: string | null;
	ConnectTo: string | null;
	CreatedOn: Date | null;
	Start: Date | null;
	RecDuration: number | null;
	InteractionPlan: string | null;
}

export const vonageCallRouter = router({
	get: procedure.input(z.object({ Guid: z.string().min(1) })).query(async ({ input: { Guid } }) => {
		const vonageCalls = (await prisma.$queryRaw`Select * from VonageCalls where Guid=${Guid}`.catch(
			prismaErrorHandler
		)) as VonageCall[];
		if (vonageCalls.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vonage Call not found' });

		const sasUrls = await azureGenerateSasUrl([Guid + '.wav']);

		return { vonageCall: vonageCalls[0], audioUrl: sasUrls?.[0] };
	})
});
