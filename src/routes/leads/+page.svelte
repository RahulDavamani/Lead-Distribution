<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate, onMount } from 'svelte';
	import { lead } from '../../stores/lead.store';
	import Icon from '@iconify/svelte';
	import { auth } from '../../stores/auth.store';
	import QueuedLeadsTable from './components/QueuedLeadsTable.svelte';
	import Loader from '../components/ui/Loader.svelte';
	import CompletedLeadsTable from './components/CompletedLeadsTable.svelte';
	import { ui } from '../../stores/ui.store';
	import NotesModal from './components/NotesModal.svelte';

	$: ({ connectionType, tab, viewMode, queuedLeads, completedLeads } = $lead);
	const { roleType } = $auth;

	onMount(lead.init);

	afterUpdate(() => {
		$page.url.searchParams.set('connection', connectionType);
		$page.url.searchParams.set('type', tab);
		window.history.replaceState(history.state, '', $page.url.toString());
	});

	$: leads = tab === 'queued' ? queuedLeads : completedLeads;
	$: affiliates = leads
		? leads.reduce(
				(acc, cur) => {
					if (!cur.prospect.CompanyName) return acc;
					if (acc[cur.prospect.CompanyName]) acc[cur.prospect.CompanyName]++;
					else acc[cur.prospect.CompanyName] = 1;
					return acc;
				},
				{} as { [key: string]: number }
			)
		: {};
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="form-control {viewMode ? 'fixed' : 'absolute'} top-2 right-2 z-10 bg-base-300 rounded-box px-2">
	<label
		class="label cursor-pointer gap-2 text-sm"
		on:click={() => {
			if (document.fullscreenElement) document.exitFullscreen();
			else document.documentElement.requestFullscreen();
		}}
	>
		<div class="font-bold">View Mode</div>
		<input type="checkbox" class="checkbox checkbox-primary checkbox-sm" bind:checked={$lead.viewMode} />
	</label>
</div>

<div class="px-16 mx-auto mb-20">
	<div class="flex justify-between items-end">
		<div class="text-3xl font-bold flex items-end gap-2 flex-grow">
			<button
				class="btn btn-sm btn-ghost"
				on:click={() => {
					$lead.connectionType = connectionType === 'http' ? 'ws' : 'http';
					$page.url.searchParams.set('connection', $lead.connectionType);
					window.history.replaceState(history.state, '', $page.url.toString());
					lead.init();
				}}
			>
				<Icon
					icon={connectionType === 'ws' ? 'wpf:connected' : 'wpf:disconnected'}
					class={connectionType === 'ws' ? 'text-success' : 'text-error'}
					width={20}
				/>
			</button>
			{#if tab === 'queued'}
				Queued Leads:
				<span class="font-normal font-mono text-2xl">({queuedLeads?.length ?? 0})</span>
			{:else}
				Completed Leads:
				<span class="font-normal font-mono text-2xl">({completedLeads?.length ?? 0})</span>
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

			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={() => lead.init()}>
				<Icon icon="mdi:refresh" class="text-info" width={22} />
			</button>
		</div>

		{#if roleType === 'ADMIN' || (roleType === 'SUPERVISOR' && !viewMode)}
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={() => ui.setModals({ showSettingsModal: true })}>
				<Icon icon="mdi:settings" width={22} />
			</button>
		{/if}

		<button
			class="btn btn-sm {tab === 'queued' ? 'btn-success' : 'btn-warning'}"
			on:click={() => {
				$lead.tab = tab === 'queued' ? 'completed' : 'queued';
				$lead.affiliate = undefined;
			}}
		>
			{tab === 'queued' ? 'View Completed Leads' : 'View Queued Leads'}
		</button>
	</div>
	<div class="divider mt-1" />

	{#if tab === 'queued'}
		{#if queuedLeads}
			<QueuedLeadsTable />
		{:else}
			<Loader title="Fetching Queued Leads" overlay={false} />
		{/if}
	{:else if completedLeads}
		<CompletedLeadsTable />
	{:else}
		<Loader title="Fetching Completed Leads" overlay={false} />
	{/if}
</div>

{#if $ui.modals.notesModalId}
	<NotesModal />
{/if}
