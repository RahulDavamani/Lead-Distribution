import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const prisma = new PrismaClient();

const getProspectDetails = async (ProspectKey) => {
	try {
		const { ProspectId, CompanyKey, CustomerFirstName, CustomerLastName, Address, ZipCode } =
			await prisma.leadProspect.findFirstOrThrow({
				where: { ProspectKey },
				select: {
					ProspectId: true,
					CompanyKey: true,
					CustomerFirstName: true,
					CustomerLastName: true,
					Address: true,
					ZipCode: true
				}
			});

		let CompanyName;
		try {
			CompanyName = (
				CompanyKey
					? await prisma.$queryRaw`select CompanyName from v_AffilateLeadDistribution where CompanyKey=${CompanyKey}`
					: []
			)[0]?.CompanyName;
		} catch (error) {
			CompanyName = undefined;
		}

		return {
			ProspectId: ProspectId,
			CustomerName: `${CustomerFirstName ?? ''} ${CustomerLastName ?? ''}`,
			CustomerAddress: `${Address ?? ''} ${ZipCode ?? ''}`,
			CompanyName
		};
	} catch (error) {
		return undefined;
	}
};

const getProcessNameSplit = (callbackNum, requeueNum) => {
	const processName = callbackNum === 0 ? `New Lead` : `Callback #${callbackNum}`;
	const requeueName = requeueNum > 0 ? `Requeue #${requeueNum}` : '';
	return [processName, requeueName];
};

const getUserStr = async (UserKey) => {
	const user = await prisma.users.findUnique({
		where: { UserKey },
		select: { VonageAgentId: true, FirstName: true, LastName: true, Email: true }
	});
	return user ? `${user.VonageAgentId}: ${user.FirstName} ${user.LastName}` : 'N/A';
};

const fetchQueuedLeads = async (UserKey, roleType) => {
	let where = {};
	switch (roleType) {
		case 'ADMIN':
			where = {};
			break;

		case 'SUPERVISOR':
			where = { rule: { supervisors: { some: { UserKey } } } };
			break;

		case 'AGENT':
			where = { rule: { operators: { some: { UserKey } } } };
			break;
	}

	let queuedLeads = await Promise.all(
		(
			await prisma.ldLead.findMany({
				where,
				include: {
					rule: {
						select: {
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
						take: 1,
						select: { UserKey: true }
					},

					responses: {
						where: { type: 'disposition' },
						orderBy: { createdAt: 'desc' },
						take: 1,
						select: { responseValue: true }
					}
				}
			})
		).map(async (lead) => {
			const notificationProcess = lead.notificationProcesses.length > 0 ? lead.notificationProcesses[0] : undefined;
			return {
				...lead,
				prospectDetails: { ...(await getProspectDetails(lead.ProspectKey)) },
				isNewLead: lead.notificationProcesses.length === 0 || lead.notificationProcesses[0].callbackNum === 0,
				notificationProcess,
				notificationProcessName: getProcessNameSplit(
					notificationProcess?.callbackNum ?? 0,
					notificationProcess?.requeueNum ?? 0
				),
				disposition: lead.responses.length > 0 ? lead.responses[0].responseValue : undefined,
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

	return queuedLeads;
};

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
	console.log('Client connected');

	ws.on('message', (message) => {
		const data = JSON.parse(message.toString());
		setInterval(async () => {
			const queuedLeads = await fetchQueuedLeads(data.UserKey, data.roleType);
			ws.send(JSON.stringify(queuedLeads));
		}, 1000);
	});
});

server.listen(8000, () => {
	console.log(`WebSocket server running on port ${8000}`);
});
