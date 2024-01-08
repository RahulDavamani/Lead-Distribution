<script lang="ts">
	import Icon from '@iconify/svelte';
	import { auth } from '../../../stores/auth.store';
	import { ui } from '../../../stores/ui.store';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { getTimeElapsedText } from '$lib/client/DateTime';

	type QueuedLead = inferProcedureOutput<AppRouter['lead']['getQueued']>['queuedLeads'][number];

	export let queuedLeads: QueuedLead[];
	export let leadHistoryModelId: string | undefined;

	onMount(() => {
		if (queuedLeads.length > 0) new DataTable('#queuedLeadsTable');
	});

	const requeue = async (ProspectKey: string) => {
		ui.setLoader({ title: 'Requeueing Lead' });
		const interval = setInterval(() => {
			if (queuedLeads.find((lead) => ProspectKey === lead.ProspectKey)?.isDistribute) {
				ui.setLoader();
				clearInterval(interval);
			}
		}, 500);
		if ($auth.user?.UserKey) await trpc($page).lead.redistribute.query({ ProspectKey, UserKey: $auth.user.UserKey });
	};

	$: agentFirstLead = queuedLeads.findIndex((lead) => !lead.isCall);
</script>

<div class="overflow-x-auto">
	<table id="queuedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th>Prospect ID</th>
				<th>Vonage GUID</th>
				<th>Created On</th>
				<th>Updated On</th>
				<th>Customer Name</th>
				<th>Customer Address</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Status</th>
				<th>Time Elapsed</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each queuedLeads as { id, ProspectId, VonageGUID, ProspectKey, createdAt, updatedAt, companyName, customerDetails, ruleName, status, isDistribute, isCall }, i}
				{@const disableViewLead = (i !== agentFirstLead && !auth.isSupervisor()) || isCall}
				<tr class="hover">
					<td class="text-center">{ProspectId}</td>
					<td
						class="text-center {VonageGUID && 'text-primary cursor-pointer hover:underline'}'}"
						on:click={() => {
							if (VonageGUID) ui.navigate(`/vonage-call-details?Guid=${VonageGUID}`);
						}}
					>
						{VonageGUID ?? 'N/A'}
					</td>
					<td>{createdAt.toLocaleString()}</td>
					<td>{updatedAt.toLocaleString()}</td>
					<td>{customerDetails.Name}</td>
					<td>{customerDetails.Address}</td>
					<td>{companyName}</td>
					<td>{ruleName}</td>
					<td>{status}</td>
					<td class="text-center">{getTimeElapsedText(createdAt, new Date())}</td>
					<td>
						<div class="flex flex-col justify-center">
							<!-- Status Btn -->
							{#if auth.isSupervisor()}
								<button
									class="btn btn-sm btn-warning mb-2 {(isDistribute || isCall) && 'btn-disabled'} text-xs min-w-24"
									on:click={() => requeue(ProspectKey)}
								>
									{isDistribute ? 'In Progress' : isCall ? 'In Call' : 'Requeue'}
								</button>
							{/if}

							<div class="flex justify-center items-center gap-2">
								<!-- Lead Details Btn -->
								<button
									class="btn btn-xs btn-info h-fit py-0.5 animate-none"
									on:click={() => (leadHistoryModelId = id)}
								>
									<Icon icon="mdi:information-variant" width={20} />
								</button>

								<!-- View Lead Btn -->
								<button
									class="btn btn-xs btn-success {disableViewLead && 'btn-disabled'}
                           h-fit py-1 flex gap-2 animate-none flex-grow"
									on:click={() => ui.navigate(`/view-lead?ProspectKey=${ProspectKey}`)}
								>
									<Icon icon="mdi:arrow-right" width={18} />
								</button>
							</div>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
