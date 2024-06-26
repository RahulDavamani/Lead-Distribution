import type { inferProcedureOutput } from '@trpc/server';
import type { AppRouter } from '../trpc/routers/app.router';
import type { QueuedLead } from '../types/QueuedLead.type';
import { get, writable } from 'svelte/store';
import { ui } from './ui.store';
import { auth } from './auth.store';
import { trpc } from '../trpc/client';
import { page } from '$app/stores';
import { trpcClientErrorHandler } from '../trpc/trpcErrorhandler';
import superjson from 'superjson';
import { audioAlert } from '$lib/client/audioAlert';
import moment from 'moment-timezone';
import { socketURL } from '$lib/socketURL';

type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>[number];

export interface Lead {
	tab: 'queued' | 'completed';
	timezone: string;
	viewMode: boolean;

	socket?: WebSocket;

	queuedLeads?: QueuedLead[];
	completedLeads?: CompletedLead[];

	today: Date;
	dateRange: Date[];
	affiliate?: string;
}

export const lead = (() => {
	const initState: Lead = {
		tab: 'queued',
		timezone: moment.tz.guess(),
		viewMode: false,

		today: new Date(),
		dateRange: [new Date(new Date().setDate(new Date().getDate() - 2)), new Date()]
	};

	const { subscribe, set, update } = writable<Lead>(initState);
	setInterval(() => update((state) => ({ ...state, today: new Date() })), 1000);

	const init = async () => {
		const $page = get(page);
		const tab = ($page.url.searchParams.get('type') as 'queued' | 'completed') ?? 'queued';

		// Reset Socket
		update((state) => {
			state.socket?.close();

			return {
				...state,
				tab,
				socket: undefined,
				interval: undefined,
				queuedLeads: undefined,
				completedLeads: undefined
			};
		});

		// Init Socket
		const socket = new WebSocket(socketURL);
		socket.onopen = messageSocket;
		socket.onmessage = onMessageSocket;
		update((state) => ({ ...state, socket }));
	};

	const messageSocket = () => {
		const { socket } = get(lead);
		if (!socket) return;

		// Generate Message
		const {
			user: { UserKey, CompanyKey },
			roleType
		} = get(auth);
		const message = {
			type: 'init',
			data: { UserKey, CompanyKey, roleType }
		};

		// Send Message Interval
		socket.send(JSON.stringify(message));
	};

	const onMessageSocket = async (event: MessageEvent) => {
		const { type, data } = superjson.parse(event.data) as { type: string; data: unknown };
		if (type === 'queuedLeads') {
			const { leads } = data as { leads: QueuedLead[] };
			updateQueuedLeads(leads);
		}
		if (type === 'triggerAudioNotification') {
			const { message } = data as { message: string };
			audioAlert(message);
			ui.setToast({ title: message, alertClasses: 'alert-info' });
		}
	};

	const updateQueuedLeads = async (newLeads: QueuedLead[]) => {
		console.log(`Fetched ${newLeads.length} Leads`);
		const { queuedLeads, completedLeads } = get(lead);
		update((state) => ({ ...state, queuedLeads: newLeads }));

		if (!completedLeads) await fetchCompletedLeads();
		else {
			const missingLead = queuedLeads?.find((ql) => !newLeads.find((nl) => nl.id === ql.id));
			const newLead = newLeads.find((nl) => !queuedLeads?.find((ql) => ql.id === nl.id));
			if (missingLead) {
				await fetchCompletedLeads();
				if (completedLeads.find((lead) => lead.id === missingLead.id))
					ui.setToast({
						title: `${missingLead.prospect.ProspectId}: Lead has been completed`,
						alertClasses: 'alert-success'
					});
			}
			if (newLead)
				ui.setToast({
					title: `${newLead.prospect.ProspectId}: New Lead has been inserted`,
					alertClasses: 'alert-success'
				});
		}
	};

	const fetchCompletedLeads = async () => {
		update((state) => ({ ...state, completedLeads: undefined }));
		const { dateRange } = get(lead);
		const {
			user: { UserKey },
			roleType
		} = get(auth);
		const $page = get(page);
		if (dateRange.length !== 2) return;

		const completedLeads = await trpc($page)
			.lead.getCompleted.query({
				dateRange: [dateRange[0].toString(), dateRange[1].toString()],
				UserKey,
				roleType
			})
			.catch((e) => trpcClientErrorHandler(e, undefined, { showToast: false }));

		update((state) => ({ ...state, completedLeads }));
	};

	return { subscribe, set, update, init, fetchCompletedLeads };
})();
