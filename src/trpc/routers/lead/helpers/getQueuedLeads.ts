import type { Prisma } from '@prisma/client';
import type { RoleType } from '../../../../stores/auth.store';
import { getLeadsWhere } from './getLeadsWhere';
import prismaErrorHandler from '../../../../prisma/prismaErrorHandler';
import { getProspectDetails } from './getProspectDetails';
import { getProcessNameSplit } from './notificationProcess';
import { getUserStr } from './user';
import { getCompanyValues } from './company';

export const getQueuedLeads = async (UserKey: string, roleType: RoleType) => {
	const where = (await getLeadsWhere(roleType, UserKey)) as Prisma.LdLeadWhereInput;

	let queuedLeads = await Promise.all(
		(
			await prisma.ldLead
				.findMany({
					where,
					include: {
						rule: {
							select: {
								id: true,
								name: true,
								supervisors: {
									where: { UserKey },
									select: { UserKey: true, isRequeue: true }
								}
							}
						},

						notificationProcesses: {
							orderBy: [{ callbackNum: 'desc' }, { requeueNum: 'desc' }],
							select: {
								createdAt: true,
								completedAt: true,
								status: true,
								callbackNum: true,
								requeueNum: true,
								notificationAttempts: {
									select: {
										id: true,
										UserKey: true,
										attempt: { select: { num: true } }
									},
									orderBy: { createdAt: 'desc' }
								},
								escalations: {
									select: {
										id: true,
										UserKey: true,
										escalation: { select: { num: true } }
									},
									orderBy: { createdAt: 'desc' }
								}
							}
						},

						calls: {
							orderBy: { createdAt: 'desc' },
							select: { createdAt: true, UserKey: true }
						},

						responses: {
							where: { type: 'disposition' },
							orderBy: { createdAt: 'desc' },
							take: 1,
							select: { responseValue: true }
						}
					}
				})
				.catch(prismaErrorHandler)
		).map(async (lead) => {
			const notificationProcess = lead.notificationProcesses.length > 0 ? lead.notificationProcesses[0] : undefined;
			return {
				...lead,
				prospectDetails: { ...(await getProspectDetails(lead.ProspectKey)) },
				company: lead.CompanyKey ? await getCompanyValues(lead.CompanyKey) : undefined,
				isNewLead: lead.notificationProcesses.length === 0 || lead.notificationProcesses[0].callbackNum === 0,
				notificationProcess,
				notificationProcessName: getProcessNameSplit(
					notificationProcess?.callbackNum ?? 0,
					notificationProcess?.requeueNum ?? 0
				),
				disposition: lead.responses.length > 0 ? lead.responses[0].responseValue : undefined,
				firstCallAt: lead.calls.length > 0 ? lead.calls[lead.calls.length - 1].createdAt : undefined,
				callUser:
					lead.calls.length > 0
						? {
								...lead.calls[0],
								userStr: lead.calls[0].UserKey ? await getUserStr(lead.calls[0].UserKey) : null
							}
						: undefined
			};
		})
	);

	// Filter Leads
	if (roleType === 'AGENT') {
		const leads = queuedLeads.filter((lead) => lead.id === '');
		for (const lead of queuedLeads) {
			const operator = await prisma.ldRuleOperator.findUnique({
				where: { ruleId_UserKey: { ruleId: lead.ruleId ?? '', UserKey: UserKey } },
				select: { assignNewLeads: true, assignCallbackLeads: true }
			});

			if (operator)
				if ((lead.isNewLead && operator.assignNewLeads) || (!lead.isNewLead && operator.assignCallbackLeads))
					leads.push(lead);
		}
		queuedLeads = leads;
	}

	// Sort Leads
	const newLeads = queuedLeads.filter((lead) => lead.isNewLead);
	const callbackLeads = queuedLeads.filter((lead) => !lead.isNewLead);
	newLeads.sort((a, b) => (a.prospectDetails.ProspectId ?? 0) - (b.prospectDetails.ProspectId ?? 0));
	callbackLeads.sort(
		(a, b) => (b.notificationProcess?.createdAt.getTime() ?? 0) - (a.notificationProcess?.createdAt.getTime() ?? 0)
	);
	queuedLeads = [...newLeads, ...callbackLeads];

	return { queuedLeads };
};
