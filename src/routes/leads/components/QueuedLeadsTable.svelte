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
	import { getTimeElapsed, getTimeElapsedText, timeToText } from '$lib/client/DateTime';

	type QueuedLead = inferProcedureOutput<AppRouter['lead']['getQueued']>['queuedLeads'][number];

	export let queuedLeads: QueuedLead[];
	export let leadDetailsModelId: string | undefined;
	$: ({
		user: { UserKey },
		roleType
	} = $auth);
	$: avgLeadTimeElapsed =
		queuedLeads.length > 0
			? Math.floor(
					queuedLeads.reduce((acc, cur) => acc + getTimeElapsed(cur.createdAt, new Date()), 0) / queuedLeads.length
				)
			: 0;

	onMount(() => {
		new DataTable('#queuedLeadsTable', { order: [], ordering: false });
	});

	const showRequeueAlert = (ProspectKey: string) => {
		$ui.alertModal = {
			title: 'Are you sure to requeue this lead?',
			body: 'This lead has already been picked by an agent',

			actions: [
				{
					name: 'Cancel',
					class: 'btn-error',
					onClick: () => ($ui.alertModal = undefined)
				},
				{
					name: 'Requeue',
					class: 'btn-warning',
					onClick: async () => {
						$ui.alertModal = undefined;
						await requeue(ProspectKey);
					}
				}
			]
		};
	};

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
	$: firstNewLead = queuedLeads.findIndex((lead) => lead.isNewLead);
</script>

<div class="overflow-x-auto">
	<div class="flex justify-center text-sm">
		<div>
			<span class="font-semibold">Avg. Lead Time Elapsed:</span>
			<span class="">{timeToText(avgLeadTimeElapsed)}</span>
		</div>
	</div>

	<table id="queuedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th class="w-1">Prospect ID</th>
				<th class="w-1">Vonage GUID</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th class="w-1">Created On</th>
				<th class="w-1">Updated On</th>
				<th><div class="text-center">Lead Time<br />Elapsed</div></th>
				<th class="w-32">Customer</th>
				<th>Customer SMS Response</th>
				<th>Lead Status</th>
				<th>Log Message</th>
				<th><div class="text-center">Actions</div></th>
			</tr>
		</thead>
		<tbody>
			{#each queuedLeads as { isNewLead, id, VonageGUID, createdAt, updatedAt, ProspectKey, prospectDetails: { ProspectId, CompanyName, CustomerName, CustomerAddress }, rule, notificationQueue, log, isNotificationQueue, isPicked, customerResponse, callUser }, i}
				{@const disableViewLead =
					(roleType === 'AGENT' && i !== agentFirstLead && callUser?.UserKey !== UserKey) ||
					(isPicked ? callUser?.UserKey !== UserKey : false)}

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
							: 'Requeue'}

				{@const statusBtnClick = () => {
					if (canRequeue)
						if (isPicked) showRequeueAlert(ProspectKey);
						else requeue(ProspectKey);
				}}

				{#if i === 0 || i === firstNewLead}
					<tr class="hover">
						{#if i == 0 && queuedLeads.filter((lead) => !lead.isNewLead).length > 0}
							<td colspan="12" class="text-center bg-info text-info-content bg-opacity-90 font-semibold">
								Callback Leads
							</td>
						{:else}
							<td colspan="12" class="text-center bg-success text-success-content bg-opacity-90 font-semibold">
								New Leads
							</td>
						{/if}
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
						<td style="display: none;" />
					</tr>
				{/if}
				<tr class="hover">
					<td>
						<div class="flex justify-center items-center gap-2">
							{#if isPicked}
								<div class="badge badge-sm badge-warning" />
							{:else if isNewLead}
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
					<td>{CompanyName ?? 'N/A'}</td>
					<td>{rule?.name ?? 'N/A'}</td>
					<td class="text-center">{createdAt.toLocaleString().replaceAll(',', '')}</td>
					<td class="text-center">{updatedAt.toLocaleString().replaceAll(',', '')}</td>
					<td class="text-center">{getTimeElapsedText(createdAt, new Date())}</td>
					<td>
						<div>{CustomerName ?? 'N/A'}</div>
						<div class="text-xs">{CustomerAddress ?? 'N/A'}</div>
					</td>
					<td>{customerResponse ?? 'No response yet'}</td>
					<td>
						<div class="font-semibold">{notificationQueue?.type ?? 'NEW LEAD'}</div>
						{#if notificationQueue}
							{#if isPicked}
								<div>Picked by {callUser?.userStr}</div>
							{:else if notificationQueue.isCompleted}
								<div>Escalated to supervisor</div>
							{:else if notificationQueue.notificationAttempts.length > 0}
								<div>Attempt {notificationQueue.notificationAttempts.length}</div>
							{/if}
						{/if}
					</td>
					<td>{log}</td>
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
