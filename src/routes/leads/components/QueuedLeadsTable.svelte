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
	export let leadDetailsModelId: string | undefined;
	$: ({
		user: { UserKey },
		roleType
	} = $auth);

	onMount(() => {
		if (queuedLeads.length > 0) new DataTable('#queuedLeadsTable');
	});

	const requeue = async (ProspectKey: string) => {
		ui.setLoader({ title: 'Requeueing Lead' });
		const interval = setInterval(() => {
			if (queuedLeads.find((lead) => ProspectKey === lead.ProspectKey)?.isNotificationQueue) {
				ui.setLoader();
				clearInterval(interval);
			}
		}, 500);
		await trpc($page).lead.redistribute.query({ ProspectKey, UserKey });
	};

	$: agentFirstLead = queuedLeads.findIndex((lead) => !lead.isPicked);
</script>

<div class="overflow-x-auto">
	<table id="queuedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th class="w-1">Prospect ID</th>
				<th class="w-1">Vonage GUID</th>
				<th class="w-1">Created On</th>
				<th class="w-1">Updated On</th>
				<th class="w-32">Customer</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Status</th>
				<th class="w-1"><div class="text-center">Lead Time Elapsed</div></th>
				<th><div class="text-center">Actions</div></th>
			</tr>
		</thead>
		<tbody>
			{#each queuedLeads as { isNewLead, id, VonageGUID, createdAt, updatedAt, ProspectKey, prospectDetails: { ProspectId, CompanyName, CustomerName, CustomerAddress }, rule, status, isNotificationQueue, isPicked, latestCallUserKey }, i}
				{@const disableViewLead =
					(roleType === 'AGENT' && i !== agentFirstLead && latestCallUserKey !== UserKey) ||
					(isPicked ? latestCallUserKey !== UserKey : false)}

				{@const canRequeue =
					roleType === 'ADMIN' ||
					(roleType === 'SUPERVISOR' && rule?.supervisors.find((s) => s.UserKey === UserKey)?.isRequeue)}

				{@const statusBtnEnable =
					roleType === 'AGENT' ? (isPicked ? false : true) : isNotificationQueue ? false : canRequeue}

				{@const statusBtnText =
					roleType === 'AGENT'
						? isPicked
							? 'Lead Picked'
							: 'Available'
						: isNotificationQueue
						  ? 'Queueing'
						  : isPicked
						    ? 'Requeue (Lead Picked)'
						    : 'Requeue'}

				{@const statusBtnClick = () => canRequeue && requeue(ProspectKey)}

				<tr class="hover">
					<td>
						<div class="flex justify-center items-center gap-2">
							{#if isNewLead}
								<div class="badge badge-sm badge-success" />
							{/if}
							{ProspectId}
						</div>
					</td>
					<td
						class="text-center {VonageGUID && 'text-primary cursor-pointer hover:underline'}'}"
						on:click={() => VonageGUID && ui.navigate(`/vonage-call-details?Guid=${VonageGUID}`)}
					>
						{VonageGUID ?? 'N/A'}
					</td>
					<td class="text-center">{createdAt.toLocaleString().replaceAll(',', '')}</td>
					<td class="text-center">{updatedAt.toLocaleString().replaceAll(',', '')}</td>
					<td>
						<div>{CustomerName ?? 'N/A'}</div>
						<div class="text-xs">{CustomerAddress ?? 'N/A'}</div>
					</td>
					<td>{CompanyName ?? 'N/A'}</td>
					<td>{rule?.name ?? 'N/A'}</td>
					<td>{status}</td>
					<td class="text-center">{getTimeElapsedText(createdAt, new Date())}</td>
					<td>
						<div class="flex flex-col justify-center">
							<!-- Status Btn -->
							<button
								class="btn btn-sm {roleType === 'AGENT' ? 'btn-success' : 'btn-warning'} mb-2
                        {!statusBtnEnable && 'btn-disabled'} text-xs min-w-24"
								on:click={statusBtnClick}
							>
								{statusBtnText}
							</button>

							<div class="flex justify-center items-center gap-2">
								<!-- Lead Details Btn -->
								<button
									class="btn btn-xs btn-info h-fit py-0.5 animate-none"
									on:click={() => (leadDetailsModelId = id)}
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
