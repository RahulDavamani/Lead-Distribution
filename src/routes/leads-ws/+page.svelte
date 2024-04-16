<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import { auth } from '../../stores/auth.store';
	import Icon from '@iconify/svelte';
	import QueuedLeadsTable from '../leads/components/QueuedLeadsTable.svelte';
	import CompletedLeadsTable from '../leads/components/CompletedLeadsTable.svelte';
	import LeadDetailsModal from '../leads/components/LeadDetailsModal.svelte';
	import SettingsModal from '../leads/components/SettingsModal.svelte';
	import SwitchCompanyModal from '../leads/components/SwitchCompanyModal.svelte';
	import { lead } from '../../stores/lead.store';
	import { ui } from '../../stores/ui.store';
	import { goto } from '$app/navigation';
	import NotesModal from '../leads/components/NotesModal.svelte';

	$: ({ roleType } = $auth);
	$: ({ init, queuedLeads, completedLeads } = $lead);

	onMount(lead.setupSocket);
	onDestroy(lead.closeSocket);

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
	<div class="flex justify-between items-end px-2">
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
					goto('/leads');
				}}
			>
				<Icon icon="wpf:connected" class="text-success" width={20} />
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
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={lead.resetSocket}>
				<Icon icon="mdi:refresh" class="text-info" width={22} />
			</button>
		</div>

		{#if roleType === 'ADMIN' || roleType === 'SUPERVISOR'}
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={() => ($lead.showSettingsModal = true)}>
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
