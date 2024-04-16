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

type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>['completedLeads'][number];

export interface Lead {
	init: boolean;
	socket?: WebSocket;

	queuedLeads: QueuedLead[];
	completedLeads: CompletedLead[];

	today: Date;
	dateRange: Date[];
	affiliate?: string;

	leadDetailsModelId?: string;
	switchCompanyModalId?: string;
	notesModalId?: string;

	showSettingsModal: boolean;
}

export const lead = (() => {
	const initState: Lead = {
		init: false,
		queuedLeads: [],
		completedLeads: [],
		today: new Date(),
		dateRange: [new Date(new Date().setDate(new Date().getDate() - 2)), new Date()],
		showSettingsModal: false
	};
	const { subscribe, set, update } = writable<Lead>(initState);
	setInterval(() => update((state) => ({ ...state, today: new Date() })), 1000);

	const setupSocket = () => {
		ui.setLoader({ title: 'Fetching Leads' });
		const {
			user: { UserKey },
			roleType
		} = get(auth);
		const socket = new WebSocket('wss://lead-distribution-ws.onrender.com');
		// const socket = new WebSocket('ws://localhost:8000');
		socket.onopen = () => socket.send(JSON.stringify({ UserKey, roleType }));
		socket.onmessage = (event) => updateQueuedLeads(superjson.parse(event.data));
		update((state) => ({ ...state, socket }));
	};

	const closeSocket = () =>
		update((state) => {
			state.socket?.close();
			return {
				...state,
				init: false,
				socket: undefined
			};
		});

	const resetSocket = () => {
		closeSocket();
		setupSocket();
	};

	const updateQueuedLeads = async (newLeads: QueuedLead[]) => {
		console.log(`Fetched ${newLeads.length} leads`);
		const { init, queuedLeads, completedLeads } = get(lead);
		if (!init) {
			await fetchCompletedLeads();
			update((state) => ({ ...state, init: true }));
		} else {
			const missingLead = queuedLeads.find((ql) => !newLeads.find((nl) => nl.id === ql.id));
			const newLead = newLeads.find((nl) => !queuedLeads.find((ql) => ql.id === nl.id));
			if (missingLead) {
				await fetchCompletedLeads();
				if (completedLeads.find((lead) => lead.id === missingLead.id))
					ui.showToast({
						title: `${missingLead.prospect.ProspectId}: Lead has been completed`,
						class: 'alert-success'
					});
			}
			if (newLead)
				ui.showToast({
					title: `${newLead.prospect.ProspectId}: New Lead has been inserted`,
					class: 'alert-success'
				});
		}

		update((state) => ({ ...state, queuedLeads: newLeads }));
	};

	const fetchCompletedLeads = async () => {
		ui.setLoader({ title: 'Fetching Leads' });
		const { dateRange } = get(lead);
		const {
			user: { UserKey },
			roleType
		} = get(auth);
		const $page = get(page);
		if (dateRange.length !== 2) return;

		const leads = await trpc($page)
			.lead.getCompleted.query({
				dateRange: [dateRange[0].toString(), dateRange[1].toString()],
				UserKey,
				roleType
			})
			.catch((e) => trpcClientErrorHandler(e, undefined, { showToast: false }));

		update((state) => ({ ...state, completedLeads: leads.completedLeads }));
		ui.setLoader();
	};

	return { subscribe, set, update, setupSocket, closeSocket, resetSocket, updateQueuedLeads, fetchCompletedLeads };
})();
