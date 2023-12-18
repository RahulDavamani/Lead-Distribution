import type { ServerLoadEvent } from '@sveltejs/kit';
import { createContext, procedure, router } from '../server';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { ruleRouter } from './rule.router';
import { operatorRouter } from './operator.router';
import { affiliateRouter } from './affiliate.router';
import { leadRouter } from './lead.router';

// Davamani@yopmail userKey 74bedd5f-c117-474c-90d5-5a13eedd068f
// rahul@xyzies userKey c3a81c29-a0f1-4470-8a70-73d3866d30e9

export const appRouter = router({
	test: procedure.query(async () => {
		// const result = await prisma.$queryRaw`select * from Users where Email = 'rahul@xyzies.com'`;
		// await prisma.$queryRaw`EXEC [p_GetVonageAgentStatus]`;
		// const result = await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready'  and AgentId='1042'`;
		// const result = await prisma.ldLead.delete({ where: { ProspectKey: '69510d62-d4ed-4262-8403-71710d04ea87' } });
		// const result = await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
		// @Title = 'Alert',
		// @Message = 'This is a Alert!',
		// @UserKeys = 'c3a81c29-a0f1-4470-8a70-73d3866d30e9',
		// @ExpireInSeconds = 600,
		// @HrefURL = 'https://www.google.co.in/',
		// @ActionBtnTitle = 'Action Button';`;
		// const result =
		// 	await prisma.$queryRaw`exec [p_Von_InitiateOutboundCall] 'C26BBA4F-8944-40FC-BB28-C112F4CD4059',1013,'+19492103047'`;
		// const result =
		// 	await prisma.$queryRaw`select * from LeadProspect where ProspectKey = '8B24406A-C8B8-4E0F-8B0C-816BF04833DA'`;
		// const UserKey = (
		// 	await prisma.users
		// 		.findFirst({
		// 			where: { VonageAgentId: '1013' },
		// 			select: { UserKey: true }
		// 		})
		// 		.catch(prismaErrorHandler)
		// )?.UserKey;
		// return result;
	}),
	rule: ruleRouter,
	operator: operatorRouter,
	affiliate: affiliateRouter,
	lead: leadRouter
});

export type AppRouter = typeof appRouter;

export const createCaller = async (event: ServerLoadEvent) => appRouter.createCaller(await createContext(event));

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
