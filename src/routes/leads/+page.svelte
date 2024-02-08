<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate, onDestroy, onMount, tick } from 'svelte';
	import CompletedLeadsTable from './components/CompletedLeadsTable.svelte';
	import QueuedLeadsTable from './components/QueuedLeadsTable.svelte';
	import { trpc } from '../../trpc/client';
	import Flatpickr from 'svelte-flatpickr';
	import { ui } from '../../stores/ui.store';
	import { auth } from '../../stores/auth.store';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../trpc/routers/app.router';
	import Icon from '@iconify/svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import LeadDetailsModal from './components/LeadDetailsModal.svelte';
	import SettingsModal from './components/SettingsModal.svelte';

	type QueuedLead = inferProcedureOutput<AppRouter['lead']['getQueued']>['queuedLeads'][number];
	type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>['completedLeads'][number];

	let queuedLeads: QueuedLead[] = [];
	let completedLeads: CompletedLead[] = [];
	let dateRange: Date[] = [new Date(new Date().setDate(new Date().getDate() - 2)), new Date()];
	let affiliateSelect: string | undefined;
	let leadDetailsModelId: string | undefined;
	let showSettingsModal = false;

	const {
		user: { UserKey },
		roleType
	} = $auth;

	$: affiliates = (() => {
		let affiliates: { [key: string]: number } = {};
		if (tab === 1)
			queuedLeads.forEach(
				({ prospectDetails: { CompanyName } }) =>
					CompanyName && (affiliates[CompanyName] = (affiliates[CompanyName] ?? 0) + 1)
			);
		else
			completedLeads.forEach(
				({ prospectDetails: { CompanyName } }) =>
					CompanyName && (affiliates[CompanyName] = (affiliates[CompanyName] ?? 0) + 1)
			);
		return affiliates;
	})();

	const fetchQueuedLeads = async () => {
		const oldQueuedLeads = queuedLeads;

		const leads = await trpc($page)
			.lead.getQueued.query({ UserKey, roleType })
			.catch((e) => trpcClientErrorHandler(e, undefined, { showToast: false }));

		queuedLeads = leads.queuedLeads;
		if (oldQueuedLeads.length !== queuedLeads.length) {
			new DataTable('#queuedLeadsTable').destroy();
			await tick();
			new DataTable('#queuedLeadsTable', { order: [] });
		}

		const missingLead = oldQueuedLeads.find((lead) => !queuedLeads.find((lead2) => lead2.id === lead.id));
		if (missingLead) {
			await fetchCompletedLeads(dateRange);
			if (completedLeads.find((lead) => lead.id === missingLead.id))
				ui.showToast({
					title: `${missingLead.prospectDetails.ProspectId}: Lead has been Closed/Completed`,
					class: 'alert-success'
				});
		}
	};

	const fetchCompletedLeads = async (dateRange: Date[]) => {
		if (dateRange.length !== 2) return;
		new DataTable('#completedLeadsTable').destroy();
		ui.setLoader({ title: 'Fetching Leads' });

		const leads = await trpc($page)
			.lead.getCompleted.query({
				dateRange: [dateRange[0].toString(), dateRange[1].toString()],
				UserKey,
				roleType
			})
			.catch((e) => trpcClientErrorHandler(e, undefined, { showToast: false }));

		completedLeads = leads.completedLeads;
		ui.setLoader();
		await tick();
		new DataTable('#completedLeadsTable', { order: [] });
	};

	let interval: NodeJS.Timeout | undefined;
	onMount(async () => {
		window.stop();

		ui.setLoader({ title: 'Fetching Leads' });
		await fetchQueuedLeads();
		await fetchCompletedLeads(dateRange);
		ui.setLoader();

		interval = setInterval(fetchQueuedLeads, 1000);
	});

	onDestroy(() => {
		window.stop();
		clearInterval(interval);
	});

	const reloadLeads = async () => {
		ui.setLoader({ title: 'Fetching Leads' });
		window.stop();
		clearInterval(interval);
		await fetchQueuedLeads();
		await fetchCompletedLeads(dateRange);
		interval = setInterval(fetchQueuedLeads, 1000);
		ui.setLoader();
	};

	let tab = $page.url.searchParams.get('type') === 'completed' ? 2 : 1;
	afterUpdate(() => {
		$page.url.searchParams.set('type', tab === 1 ? 'queued' : 'completed');
		window.history.replaceState(history.state, '', $page.url.toString());
	});
</script>

<div class="container mx-auto">
	<div class="flex justify-between items-end">
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
			{#if tab === 2}
				<Flatpickr
					placeholder="Choose Date"
					class="input input-bordered input-sm cursor-pointer font-semibold text-center max-w-xs w-full ml-3"
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

			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={reloadLeads}>
				<Icon icon="mdi:refresh" class="text-info" width={22} />
			</button>
		</div>

		{#if roleType === 'ADMIN' || roleType === 'SUPERVISOR'}
			<button class="btn btn-sm btn-square btn-ghost mr-2" on:click={() => (showSettingsModal = true)}>
				<Icon icon="mdi:settings" width={22} />
			</button>
		{/if}
		<button class="btn btn-sm {tab === 1 ? 'btn-success' : 'btn-warning'}" on:click={() => (tab = tab === 1 ? 2 : 1)}>
			{tab === 1 ? 'View Completed Leads' : 'View Queued Leads'}
		</button>
	</div>
	<div class="divider mt-1" />

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
		/>
	{/if}
</div>

<LeadDetailsModal bind:id={leadDetailsModelId} />
<SettingsModal bind:showModal={showSettingsModal} />
