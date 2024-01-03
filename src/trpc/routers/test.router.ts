import { procedure, router } from '../server';

export const testRouter = router({
	test: procedure.query(async () => {
		// const prospect = await prisma.leadProspect.findMany({ where: { Email: 'test_dev@gmail.com' } });
		// console.log(prospect);
		// const ProspectKey = 'FF9BC1E9-F0DD-4210-8FD4-16D4382FE149';
		// const UserKey = '5a36aa41-73e1-44f7-b71b-f5bceeaff626';
		// const UserId = UserKey
		// 	? Number((await prisma.users.findFirst({ where: { UserKey }, select: { VonageAgentId: true } }))?.VonageAgentId)
		// 	: undefined;
		// const lead = await prisma.ldLead.findFirst({
		// 	where: {
		// 		ProspectKey,
		// 		isCompleted: false
		// 	},
		// 	include: { attempts: true }
		// });
		// console.log(lead);
		// const result = await prisma.$queryRaw`select Email from VonageUsers where UserId = 1013 and Active=1`;
		// await prisma.$queryRaw`EXEC [p_GetVonageAgentStatus]`;
		// const result = await prisma.$queryRaw`select * from VonageAgentStatus where Status='Ready'  and AgentId='1042'`;
		await prisma.ldLead.delete({ where: { ProspectKey: '91E5EBB8-B82C-43FE-94A3-ED4C0F350EB6' } });
		// console.log(await prisma.ldLeadToken.findMany());
		// const result = await prisma.$queryRaw`select * from Users where Email='davamani@xyzies.com'`;
		// const result = await prisma.$queryRaw`EXEC [dbo].[p_PA_SendPushAlert]
		// @Title = 'Alert',
		// @Message = 'This is a Alert!',
		// @UserKeys = '219610cd-e93e-48b9-9542-e14e4bc40c01',
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
		// scheduleJob(new Date('2024-01-02T02:01:00'), () => {
		// 	console.log('hello');
		// });
	})
});
