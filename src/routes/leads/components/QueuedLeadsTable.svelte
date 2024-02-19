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

	const showRequeueAlert = (ProspectKey: string, alertType: 'picked' | 'scheduled') => {
		$ui.alertModal = {
			title: 'Are you sure to requeue this lead?',
			body:
				alertType === 'picked'
					? 'This lead has already been picked by an agent'
					: 'This lead has already been scheduled for a callback. Requeuing this lead will cancel the previously scheduled requeues',

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
			if (queuedLeads.find((lead) => ProspectKey === lead.ProspectKey)?.notificationProcess?.status === 'ACTIVE') {
				ui.setLoader();
				clearInterval(interval);
			}
		}, 500);
		await trpc($page).lead.redistribute.query({ ProspectKey, UserKey });
	};

	$: agentFirstNewLead = queuedLeads.findIndex((lead) => !lead.isPicked && lead.isNewLead);
	$: firstCallback = queuedLeads.findIndex((lead) => !lead.isNewLead);
</script>

<div class="overflow-x-auto">
	<div class="flex justify-start text-sm mb-2">
		<div>
			<span class="font-semibold">Avg. Lead Time Elapsed:</span>
			<span class="">{timeToText(avgLeadTimeElapsed)}</span>
		</div>
	</div>

	<table id="queuedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th>Prospect ID</th>
				<th>Vonage GUID</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Created On</th>
				<th>Updated On</th>
				<th><div class="text-center">Lead Time<br />Elapsed</div></th>
				<th>Customer</th>
				<th>Customer SMS Response</th>
				<th>Lead Status</th>
				<th>Log Message</th>
				<th><div class="text-center">Actions</div></th>
			</tr>
		</thead>
		<tbody>
			{#each queuedLeads as { id, VonageGUID, createdAt, updatedAt, ProspectKey, isNewLead, isPicked, prospectDetails: { ProspectId, CompanyName, CustomerName, CustomerAddress }, rule, log, notificationProcess, notificationProcessName, callUser, customerResponse }, i}
				{@const disableViewLead =
					(roleType === 'AGENT' &&
						callUser?.UserKey !== UserKey &&
						(isNewLead
							? i !== agentFirstNewLead
							: notificationProcess?.createdAt.toLocaleDateString() !== new Date().toLocaleDateString())) ||
					(isPicked ? callUser?.UserKey !== UserKey : false)}

				{@const canRequeue =
					roleType === 'ADMIN' ||
					(roleType === 'SUPERVISOR' && rule?.supervisors.find((s) => s.UserKey === UserKey)?.isRequeue)}

				{@const statusBtnEnable =
					roleType === 'AGENT'
						? isPicked
							? false
							: true
						: notificationProcess?.status === 'ACTIVE'
							? false
							: canRequeue}

				{@const statusBtnText =
					roleType === 'AGENT'
						? isPicked
							? 'Lead Picked'
							: 'Available'
						: notificationProcess?.status === 'ACTIVE'
							? 'Queueing'
							: 'Requeue'}

				{@const statusBtnClick = () => {
					if (canRequeue)
						if (isPicked) showRequeueAlert(ProspectKey, 'picked');
						else if (notificationProcess?.status === 'SCHEDULED') showRequeueAlert(ProspectKey, 'scheduled');
						else requeue(ProspectKey);
				}}

				{#if i === 0 || i === firstCallback}
					<tr class="hover">
						{#if i == 0 && queuedLeads.filter((lead) => lead.isNewLead).length > 0}
							<td colspan="12" class="text-center bg-success text-success-content bg-opacity-90 font-semibold">
								New Leads
							</td>
						{:else}
							<td colspan="12" class="text-center bg-info text-info-content bg-opacity-90 font-semibold">
								Callback Leads
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
								<div class="badge badge-sm badge-success" />
							{:else if isNewLead}
								<div class="badge badge-sm badge-error" />
							{:else if notificationProcess?.requeueNum === 0}
								<div class="badge badge-sm bg-orange-400" />
							{:else}
								<div class="badge badge-sm badge-warning" />
							{/if}
							{ProspectId}
							{ProspectKey}
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
						<div class="font-semibold whitespace-nowrap">{notificationProcessName[0]}</div>
						<div class="font-semibold whitespace-nowrap">{notificationProcessName[1]}</div>
						<div class="">
							{#if notificationProcess}
								{#if isPicked}
									Picked by {callUser?.userStr}
								{:else if notificationProcess.status === 'SCHEDULED'}
									Scheduled in {getTimeElapsedText(new Date(), notificationProcess.createdAt)}
								{:else if notificationProcess.escalations.length > 0}
									Escalation #{notificationProcess.escalations[0].escalation?.num}
								{:else if notificationProcess.notificationAttempts.length > 0}
									Attempt #{notificationProcess.notificationAttempts[0].attempt?.num}
								{/if}
							{/if}
						</div>
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
