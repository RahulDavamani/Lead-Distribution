import { calculateLeadDuration } from '$lib/client/DateTime';

export const getLeadResponseTime = async (ProspectKey: string) => {
	const call = await prisma.ldLeadCall.findFirst({
		where: { OR: [{ lead: { ProspectKey } }, { completedLead: { ProspectKey } }] },
		orderBy: { createdAt: 'asc' },
		take: 1,
		select: {
			createdAt: true,
			user: { select: { UserKey: true, CompanyKey: true } }
		}
	});
	if (!call) return null;

	if (!call.user?.CompanyKey) return null;

	const notificationProcess = await prisma.ldLeadNotificationProcess.findFirst({
		where: {
			OR: [{ lead: { ProspectKey } }, { completedLead: { ProspectKey } }],
			createdAt: { lt: call.createdAt }
		},
		orderBy: { createdAt: 'desc' },
		select: { createdAt: true, callbackNum: true, requeueNum: true }
	});
	if (!notificationProcess) return null;

	const rule = await prisma.ldRule.findFirst({
		where: { OR: [{ queuedLeads: { some: { ProspectKey } } }, { completedLeads: { some: { ProspectKey } } }] },
		select: { id: true }
	});
	if (!rule) return null;

	const company = await prisma.ldRuleCompany.findUnique({
		where: { ruleId_CompanyKey: { ruleId: rule.id, CompanyKey: call.user.CompanyKey } },
		select: {
			timezone: true,
			workingHours: {
				select: {
					id: true,
					start: true,
					end: true,
					days: true
				}
			}
		}
	});
	if (!company) return null;
	// console.log(notificationProcess.createdAt.toLocaleString('en-US', { timeZone: company.timezone }));
	// console.log(call.createdAt.toLocaleString('en-US', { timeZone: company.timezone }));

	return calculateLeadDuration(notificationProcess.createdAt, call.createdAt, company);
};
