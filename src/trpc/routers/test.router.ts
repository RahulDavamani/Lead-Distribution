import { procedure, router } from '../server';

export const testRouter = router({
	test: procedure.query(async () => {
		// const result = await prisma.leadProspect.findMany({ where: { Email: 'ranji-7657-hook@yopmail.com' } });
		// console.log(result);
		// const result =
		// 	await prisma.$queryRaw`insert into Domo_Google_ConversionRequest (RequestKey, FileKey, CustomerId, TotalCnt, UploadedCnt, ExceptionCnt, Exception) values ('124218dc-a91a-49a7-9a1a-6b10939d5d5f', '8E7808E1-3A5D-4D3D-8E80-F41A6CBF2F3E', '3094113984', 359, 1, 358, '')`;
		// const result = await prisma.$queryRaw`delete from Domo_Google_ConversionRequest`;
		// console.log(result);
		// console.log(await prisma.companies.count({}));
		// const leads = await prisma.ldLeadCompleted.findMany({
		// 	select: {
		// 		id: true,
		// 		updatedAt: true,
		// 		notificationProcesses: {
		// 			select: { id: true, createdAt: true, completedAt: true },
		// 			orderBy: { createdAt: 'desc' }
		// 		}
		// 	}
		// });
		// for (const { updatedAt, notificationProcesses } of leads) {
		// 	let i = 0;
		// 	for (const { id } of notificationProcesses) {
		// 		if (i === 0) {
		// 			await prisma.ldLeadNotificationProcess.update({
		// 				where: { id },
		// 				data: { completedAt: updatedAt }
		// 			});
		// 		} else {
		// 			await prisma.ldLeadNotificationProcess.update({
		// 				where: { id },
		// 				data: { completedAt: notificationProcesses[i - 1].createdAt }
		// 			});
		// 		}
		// 		i += 1;
		// 	}
		// }
		// const leads = await prisma.ldLead.findMany({
		// 	select: {
		// 		id: true,
		// 		notificationProcesses: {
		// 			select: { id: true, createdAt: true, completedAt: true },
		// 			orderBy: { createdAt: 'desc' }
		// 		}
		// 	}
		// });
		// for (const { notificationProcesses } of leads) {
		// 	let i = 0;
		// 	for (const { id } of notificationProcesses) {
		// 		if (i === 0) {
		// 			await prisma.ldLeadNotificationProcess.update({
		// 				where: { id },
		// 				data: { completedAt: null }
		// 			});
		// 		} else {
		// 			await prisma.ldLeadNotificationProcess.update({
		// 				where: { id },
		// 				data: { completedAt: notificationProcesses[i - 1].createdAt }
		// 			});
		// 		}
		// 		i += 1;
		// 	}
		// }
		// const ProspectKey = '05F46F18-47F7-4F27-A982-C60FEC8F0159';
		// const CompanyKey = await getCompanyKey(ProspectKey);
		// if (!CompanyKey) return console.log(404, 'CompanyKey not found');
		// const rule = await prisma.ldRule
		// 	.findFirst({
		// 		where: { affiliates: { some: { CompanyKey } } },
		// 		select: {
		// 			id: true
		// 		},
		// 		orderBy: { createdAt: 'desc' }
		// 	})
		// 	.catch(prismaErrorHandler);
		// if (!rule) return console.log(404, 'Rule not found');
		// const lead = await prisma.ldLeadCompleted
		// 	.create({
		// 		data: {
		// 			ProspectKey,
		// 			ruleId: rule.id,
		// 			success: true,
		// 			completeStatus: 'Completed Lead from GHL',
		// 			logs: {
		// 				create: { log: 'Lead completed: Completed Lead from GHL' }
		// 			}
		// 		}
		// 	})
		// 	.catch(prismaErrorHandler);
		// console.log(lead);
		// console.log(await prisma.ldLeadCompleted.findUniqueOrThrow({ where: { ProspectKey } }));
		// console.log(await prisma.users.findFirst({ where: { VonageAgentId: '1009' } }));
		// console.log(await getAvailableOperators());
		// const result =
		// 	(await prisma.$queryRaw`select top 1 * from leadprospect where source=1 order by createdon desc`) as {
		// 		ProspectKey: string;
		// 	}[];
		// console.log(result);
		// await prisma.$queryRaw`Exec [p_LDMS_PushLeadInToQueue] ${result[0].ProspectKey}`;
		// const today = new Date();
		// const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		// const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
		// await prisma.ldLeadLog.deleteMany({
		// 	where: { lead: { createdAt: { not: { gte: startOfDay, lt: endOfDay } } } }
		// });
		// await prisma.ldLeadNotificationAttempt.deleteMany({});
		// await prisma.ldLeadEscalation.deleteMany({});
		// await prisma.ldLeadNotificationProcess.deleteMany({});
		// await prisma.ldLeadCall.deleteMany({});
		// await prisma.ldLeadMessage.deleteMany({});
		// await prisma.ldLeadResponse.deleteMany({});
		// const prospect = await prisma.leadProspect
		// 	.findFirstOrThrow({
		// 		where: { ProspectId: 49600 },
		// 		orderBy: { CreatedOn: 'desc' }
		// 	})
		// 	.catch();
		// console.log(prospect);
		// console.log(await prisma.ldRule.findMany({ select: { id: true, name: true } }));
		// await prisma.ldLead.update({
		// 	where: { ProspectKey: '633526b4-74f5-4622-9b60-68090e2cbdd0' },
		// 	data: { ruleId: 'aHxktsc4w_LSafp9OzjvZ' }
		// });
		// await prisma.ldLeadCompleted.deleteMany({});
		// console.log(await prisma.leadProspect.findMany({ where: { Email: 'abcd@gmail.com' } }));
		// const operators = (await prisma.$queryRaw`
		//    select Users.UserKey, Users.FirstName, Users.LastName, Users.Email, Users.VonageAgentId
		//    from VonageUsers inner join Users on VonageUsers.UserId=Users.VonageAgentId
		//    where VonageUsers.Active=1
		// `);
		// console.log(operators.length);
		// console.log(operators[0]);
		// const rules = await prisma.ldRule.findMany({ select: { id: true } });
		// for (const { id } of rules) {
		// 	const actions1 = await prisma.ldRuleActions.create({ data: {} });
		// 	const actions2 = await prisma.ldRuleActions.create({ data: {} });
		// 	await prisma.ldRule.update({
		// 		where: { id },
		// 		data: {
		// 			dispositionsUnMatchActionsId: actions1.id,
		// 			dispositionsLimitExceedActionsId: actions2.id
		// 		}
		// 	});
		// }
		// const x = await prisma.ldRuleActions.create({
		// 	data: {}
		// });
		// const ProspectKeys = await prisma.ldLead.deleteMany({
		// 	where: { ProspectKey: 'F13BEE4E-06EC-4D75-8846-FEE71E26DCAA' }
		// });
		// console.log(ProspectKeys);
		// [
		//    { ProspectKey: 'ED8BB4B7-CF80-4D7B-89F9-D6DCDC9CD83E' },
		//    { ProspectKey: 'E238814B-4FDE-4D7C-B4EB-F0D57E5301DE' },
		//    { ProspectKey: '80710479-392D-490A-A9C8-77F6CD47EF84' },
		//    { ProspectKey: '19AC76FD-A0CD-48DB-9DB1-D25C79CE2590' },
		//    { ProspectKey: '958879B5-EF68-4403-B195-E0FFE3BE1AF5' },
		//    { ProspectKey: '392DF353-88C5-45A5-8408-BDACFBB17AE4' }
		// console.log(await getProspectDetails('E139170E-7DEF-4C7B-87B3-520DA8A36D73'));
		// const UserKey = '5a36aa41-73e1-44f7-b71b-f5bceeaff626';
		// const result =
		// 	await prisma.$queryRaw`Exec p_Report_AuthUserAction 'TK_INS',null,${UserKey},null,'84AE2871-599E-4812-A874-321FA7ED5CF6'`;
		// console.log(result);
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
		// await prisma.ldLead.delete({ where: { ProspectKey: '56135F1F-F051-4C8C-9403-EA1F9965213F' } });
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
