<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate, onDestroy, onMount, tick } from 'svelte';
	import { trpc } from '../../trpc/client';
	import { ui } from '../../stores/ui.store';
	import { auth } from '../../stores/auth.store';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../trpc/routers/app.router';
	import Icon from '@iconify/svelte';
	import QueuedLeadsTable from '../leads/components/QueuedLeadsTable.svelte';
	import CompletedLeadsTable from '../leads/components/CompletedLeadsTable.svelte';
	import LeadDetailsModal from '../leads/components/LeadDetailsModal.svelte';
	import SettingsModal from '../leads/components/SettingsModal.svelte';

	type QueuedLead = inferProcedureOutput<AppRouter['lead']['getQueued']>['queuedLeads'][number];
	type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>['completedLeads'][number];

	let init = false;
	let socket: WebSocket;
	let queuedLeads: QueuedLead[] = [];
	let completedLeads: CompletedLead[] = [];
	let dateRange: Date[] = [new Date(new Date().setDate(new Date().getDate() - 2)), new Date()];

	const {
		user: { UserKey },
		roleType
	} = $auth;

	onMount(() => setupSocket());
	onDestroy(() => socket.close());

	const setupSocket = () => {
		ui.setLoader({ title: 'Fetching Leads' });
		const webSocketProtocol = window.location.href.startsWith('https://') ? 'wss://' : 'ws://';
		const url = `${webSocketProtocol}${window.location.hostname}:80`;
		socket = new WebSocket(url);
		console.log(url);
		console.log(socket);
		socket.onopen = () => socket.send(JSON.stringify({ UserKey, roleType }));
		socket.onmessage = (event) => updateQueuedLeads(JSON.parse(event.data));
	};

	const resetSocket = () => {
		init = false;
		socket.close();
		setupSocket();
	};

	const updateQueuedLeads = async (newLeads: QueuedLead[]) => {
		console.log(newLeads.length);
		if (!init) {
			await fetchCompletedLeads(dateRange);
			init = true;
		} else {
			const missingLead = queuedLeads.find((ql) => !newLeads.find((nl) => nl.id === ql.id));
			const newLead = newLeads.find((nl) => !queuedLeads.find((ql) => ql.id === nl.id));
			if (missingLead) {
				await fetchCompletedLeads(dateRange);
				if (completedLeads.find((lead) => lead.id === missingLead.id))
					ui.showToast({
						title: `${missingLead.prospectDetails.ProspectId}: Lead has been completed`,
						class: 'alert-success'
					});
			}
			if (newLead)
				ui.showToast({
					title: `${newLead.prospectDetails.ProspectId}: New Lead has been inserted`,
					class: 'alert-success'
				});
		}

		queuedLeads = newLeads.map(({ createdAt, updatedAt, notificationProcess, ...queuedLeads }) => ({
			...queuedLeads,
			createdAt: new Date(createdAt),
			updatedAt: new Date(updatedAt),
			notificationProcess: notificationProcess
				? {
						...notificationProcess,
						createdAt: new Date(notificationProcess.createdAt)
					}
				: undefined
		}));
	};

	const fetchCompletedLeads = async (dateRange: Date[]) => {
		ui.setLoader({ title: 'Fetching Leads' });
		if (dateRange.length !== 2) return;

		const leads = await trpc($page)
			.lead.getCompleted.query({
				dateRange: [dateRange[0].toString(), dateRange[1].toString()],
				UserKey,
				roleType
			})
			.catch((e) => trpcClientErrorHandler(e, undefined, { showToast: false }));

		completedLeads = leads.completedLeads;
		ui.setLoader();
	};

	let tab = $page.url.searchParams.get('type') === 'completed' ? 2 : 1;
	afterUpdate(() => {
		$page.url.searchParams.set('type', tab === 1 ? 'queued' : 'completed');
		window.history.replaceState(history.state, '', $page.url.toString());
	});

	let leadDetailsModelId: string | undefined;
	let showSettingsModal = false;

	let affiliateSelect: string | undefined;
	$: affiliates = [...completedLeads, ...queuedLeads].reduce(
		(acc, cur) =>
			!cur.prospectDetails.CompanyName || acc.includes(cur.prospectDetails.CompanyName)
				? acc
				: [...acc, cur.prospectDetails.CompanyName],
		[] as string[]
	);
</script>

<div class="container mx-auto mb-20">
	<div class="flex justify-between items-end px-2">
		<div class="text-3xl font-bold flex items-end gap-2 flex-grow">
			{#if tab === 1}
				Queued Leads:
				<span class="font-normal font-mono text-2xl">({queuedLeads.length})</span>
			{:else}
				Completed Leads:
				<span class="font-normal font-mono text-2xl">({completedLeads.length})</span>
			{/if}

			<select
				class="select select-bordered select-sm font-semibold text-center max-w-xs w-full ml-3"
				bind:value={affiliateSelect}
			>
				<option value={undefined}>All Affiliates</option>
				{#each Object.entries(affiliates) as [companyName, count]}
					<option value={companyName}>{companyName} ({count})</option>
				{/each}
			</select>
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={resetSocket}>
				<Icon icon="mdi:refresh" class="text-info" width={22} />
			</button>
		</div>

		{#if roleType === 'ADMIN' || roleType === 'SUPERVISOR'}
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={() => (showSettingsModal = true)}>
				<Icon icon="mdi:settings" width={22} />
			</button>
		{/if}
		<label class="swap">
			<input type="checkbox" checked={tab === 1} on:change={() => (tab = tab === 1 ? 2 : 1)} />
			<div class="swap-on btn btn-sm btn-success">View Completed Leads</div>
			<div class="swap-off btn btn-sm btn-warning">View Queued Leads</div>
		</label>
	</div>
	<div class="divider mt-1" />

	{#if init}
		{#if tab === 1}
			<QueuedLeadsTable
				queuedLeads={queuedLeads.filter(({ prospectDetails: { CompanyName } }) =>
					affiliateSelect ? CompanyName === affiliateSelect : true
				)}
				bind:leadDetailsModelId
			/>
		{:else}
			<CompletedLeadsTable
				completedLeads={completedLeads.filter(({ prospectDetails: { CompanyName } }) =>
					affiliateSelect ? CompanyName === affiliateSelect : true
				)}
				bind:leadDetailsModelId
				bind:dateRange
				{fetchCompletedLeads}
			/>
		{/if}
	{/if}
</div>

<LeadDetailsModal bind:id={leadDetailsModelId} />
<SettingsModal bind:showModal={showSettingsModal} />
