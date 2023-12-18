<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate, onDestroy, onMount, tick } from 'svelte';
	import type { PageData } from './$types';
	import CompletedLeadsTable from './components/CompletedLeadsTable.svelte';
	import QueuedLeadsTable from './components/QueuedLeadsTable.svelte';
	import { trpc } from '../../trpc/client';
	import Flatpickr from 'svelte-flatpickr';
	import { ui } from '../../stores/ui.store';

	export let data: PageData;
	let queuedLeads = data.queuedLeads;
	let completedLeads = data.completedLeads;

	const fetchQueuedLeads = async () => {
		const leads = await trpc($page).lead.getQueued.query();
		queuedLeads = leads.queuedLeads.map((lead) => ({
			...lead,
			createdAt: new Date(lead.createdAt),
			updatedAt: new Date(lead.updatedAt),
			ProspectId: lead.ProspectId,
			ruleUserId: lead.ruleUserId,
			history: lead.history.map((history) => ({
				...history,
				createdAt: new Date(history.createdAt),
				updatedAt: new Date(history.updatedAt)
			}))
		}));
	};

	let dateRange: Date[] = [new Date(new Date().setDate(new Date().getDate() - 2)), new Date()];
	const fetchCompletedLeads = async (dateRange: Date[]) => {
		ui.setLoader({ title: 'Fetching Completed Leads' });
		const leads = await trpc($page).lead.getCompleted.query({
			dateRange: [dateRange[0].toString(), dateRange[1].toString()]
		});
		completedLeads = leads.completedLeads.map((lead) => ({
			...lead,
			createdAt: new Date(lead.createdAt),
			updatedAt: new Date(lead.updatedAt),
			ProspectId: lead.ProspectId,
			ruleUserId: lead.ruleUserId,
			history: lead.history.map((history) => ({
				...history,
				createdAt: new Date(history.createdAt),
				updatedAt: new Date(history.updatedAt)
			}))
		}));
		ui.setLoader();
	};

	let interval: NodeJS.Timeout | undefined;
	onMount(async () => (interval = setInterval(fetchQueuedLeads, 1000)));
	onDestroy(() => clearInterval(interval));

	let tab = $page.url.searchParams.get('type') === 'completed' ? 2 : 1;
	afterUpdate(() => window.history.replaceState(history.state, '', `?type=${tab === 1 ? 'queued' : 'completed'}`));
</script>

<div class="container mx-auto">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold flex items-end gap-2 flex-grow">
			{#if tab === 1}
				Queued Leads:
				<span class="font-normal font-mono text-2xl">({queuedLeads.length})</span>
			{:else}
				Completed Leads:
				<span class="font-normal font-mono text-2xl">({completedLeads.length})</span>
				<Flatpickr
					placeholder="Choose Date"
					class="input input-bordered input-sm cursor-pointer font-semibold text-lg text-center max-w-sm w-full ml-3"
					bind:value={dateRange}
					on:close={() => fetchCompletedLeads(dateRange)}
					options={{
						mode: 'range',
						altInput: true,
						altFormat: 'F j, Y',
						dateFormat: 'Y-m-d',
						allowInput: true
					}}
				/>
			{/if}
		</h1>
		<button class="btn btn-sm {tab === 1 ? 'btn-success' : 'btn-warning'}" on:click={() => (tab = tab === 1 ? 2 : 1)}>
			{tab === 1 ? 'View Completed Leads' : 'View Queued Leads'}
		</button>
	</div>
	<div class="divider mt-1" />

	{#if tab === 1}
		<QueuedLeadsTable {queuedLeads} />
	{:else}
		<CompletedLeadsTable {completedLeads} />
	{/if}
</div>
