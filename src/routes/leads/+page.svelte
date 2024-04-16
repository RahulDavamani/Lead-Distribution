<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import CompletedLeadsTable from './components/CompletedLeadsTable.svelte';
	import QueuedLeadsTable from './components/QueuedLeadsTable.svelte';
	import { trpc } from '../../trpc/client';
	import { ui } from '../../stores/ui.store';
	import { auth } from '../../stores/auth.store';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import Icon from '@iconify/svelte';
	import LeadDetailsModal from './components/LeadDetailsModal.svelte';
	import SettingsModal from './components/SettingsModal.svelte';
	import SwitchCompanyModal from './components/SwitchCompanyModal.svelte';
	import type { QueuedLead } from '../../types/QueuedLead.type';
	import { lead } from '../../stores/lead.store';
	import { goto } from '$app/navigation';
	import NotesModal from './components/NotesModal.svelte';

	$: ({ init, queuedLeads, completedLeads } = $lead);

	const {
		user: { UserKey },
		roleType
	} = $auth;

	const fetchQueuedLeads = async () => {
		const leads = (await trpc($page)
			.lead.getQueued.query({ UserKey, roleType })
			.catch((e) => trpcClientErrorHandler(e, undefined, { showToast: false }))) as QueuedLead[];
		await lead.updateQueuedLeads(leads);
	};

	let interval: NodeJS.Timeout | undefined;
	onMount(async () => {
		window.stop();

		ui.setLoader({ title: 'Fetching Leads' });
		await fetchQueuedLeads();
		await lead.fetchCompletedLeads();
		interval = setInterval(fetchQueuedLeads, 5000);
		ui.setLoader();

		$lead.init = true;
	});

	onDestroy(() => {
		window.stop();
		clearInterval(interval);
	});

	const reloadLeads = async () => {
		window.stop();
		ui.setLoader({ title: 'Fetching Leads' });
		clearInterval(interval);
		await fetchQueuedLeads();
		await lead.fetchCompletedLeads();
		interval = setInterval(fetchQueuedLeads, 5000);
		ui.setLoader();
	};

	let tab = $page.url.searchParams.get('type') === 'completed' ? 2 : 1;
	afterUpdate(() => {
		$page.url.searchParams.set('type', tab === 1 ? 'queued' : 'completed');
		window.history.replaceState(history.state, '', $page.url.toString());
	});

	$: affiliates = [...completedLeads, ...queuedLeads].reduce(
		(acc, cur) =>
			!cur.prospect.CompanyName || acc.includes(cur.prospect.CompanyName) ? acc : [...acc, cur.prospect.CompanyName],
		[] as string[]
	);
</script>

<div class="px-16 mx-auto mb-20">
	<div class="flex justify-between items-end">
		<div class="text-3xl font-bold flex items-end gap-2 flex-grow">
			<button
				class="btn btn-sm btn-ghost"
				on:click={() => {
					lead.update((state) => ({
						...state,
						init: false,
						queuedLeads: [],
						completedLeads: [],
						leadDetailsModelId: undefined,
						switchCompanyModalId: undefined,
						notesModalId: undefined,
						showSettingsModal: false
					}));
					window.stop();
					goto('/leads-ws');
				}}
			>
				<Icon icon="wpf:disconnected" class="text-error" width={20} />
			</button>
			{#if tab === 1}
				Queued Leads:
				<span class="font-normal font-mono text-2xl">({queuedLeads.length})</span>
			{:else}
				Completed Leads:
				<span class="font-normal font-mono text-2xl">({completedLeads.length})</span>
			{/if}

			<select
				class="select select-bordered select-sm font-semibold text-center max-w-xs w-full ml-3"
				bind:value={$lead.affiliate}
			>
				<option value={undefined}>All Affiliates</option>
				{#each Object.entries(affiliates) as [companyName, count]}
					<option value={companyName}>{companyName} ({count})</option>
				{/each}
			</select>

			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={reloadLeads}>
				<Icon icon="mdi:refresh" class="text-info" width={22} />
			</button>
		</div>

		{#if roleType === 'ADMIN' || roleType === 'SUPERVISOR'}
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={() => ($lead.showSettingsModal = true)}>
				<Icon icon="mdi:settings" width={22} />
			</button>
		{/if}
		<button class="btn btn-sm {tab === 1 ? 'btn-success' : 'btn-warning'}" on:click={() => (tab = tab === 1 ? 2 : 1)}>
			{tab === 1 ? 'View Completed Leads' : 'View Queued Leads'}
		</button>
	</div>
	<div class="divider mt-1" />

	{#if init}
		{#if tab === 1}
			<QueuedLeadsTable />
		{:else}
			<CompletedLeadsTable />
		{/if}
	{/if}
</div>

<LeadDetailsModal />
<SwitchCompanyModal />
<SettingsModal />
{#if $lead.notesModalId}
	<NotesModal />
{/if}
