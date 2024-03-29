<script lang="ts">
	import Icon from '@iconify/svelte';
	import { auth } from '../../../stores/auth.store';
	import { ui } from '../../../stores/ui.store';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { getTimeElapsed, getTimeElapsedText, timeToText } from '$lib/client/DateTime';
	import FormControl from '../../components/FormControl.svelte';
	import { onMount } from 'svelte';

	type QueuedLead = inferProcedureOutput<AppRouter['lead']['getQueued']>['queuedLeads'][number];

	export let queuedLeads: QueuedLead[];
	export let leadDetailsModelId: string | undefined;

	let today = new Date();
	onMount(() => setInterval(() => (today = new Date()), 1000));

	$: ({
		user: { UserKey },
		roleType
	} = $auth);
	$: avgLeadTimeElapsed =
		queuedLeads.length > 0
			? Math.floor(queuedLeads.reduce((acc, cur) => acc + getTimeElapsed(cur.createdAt, today), 0) / queuedLeads.length)
			: 0;

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
		await trpc($page).lead.requeue.query({ ProspectKey, UserKey });
	};

	$: agentFirstNewLead = queuedLeads.findIndex((lead) => !lead.isPicked && lead.isNewLead);

	let deleteLeadIds: string[] | undefined;

	const deleteLeads = () => {
		$ui.alertModal = {
			title: 'Are you sure to delete these leads?',
			body: 'This action cannot be undone',
			actions: [
				{
					name: 'Cancel',
					class: 'btn-warning',
					onClick: () => ($ui.alertModal = undefined)
				},
				{
					name: 'Delete',
					class: 'btn-error',
					onClick: async () => {
						$ui.alertModal = undefined;
						if (!deleteLeadIds) return;
						ui.setLoader({ title: 'Deleting Leads' });
						await trpc($page).lead.delete.query({ ids: deleteLeadIds, isCompleted: false });
						ui.setLoader();
						deleteLeadIds = undefined;
					}
				}
			]
		};
	};

	let tableOpts = {
		search: '',
		page: 1,
		show: 10
	};
	$: startIndex = (tableOpts.page - 1) * tableOpts.show;
	$: endIndex = startIndex + tableOpts.show;
	$: displayLeads = queuedLeads.filter((l) =>
		[l.prospectDetails.CompanyName, l.prospectDetails.CustomerName, l.prospectDetails.CustomerAddress]
			.join()
			.toLowerCase()
			.includes(tableOpts.search.toLowerCase())
	);
	$: firstCallback = displayLeads.slice(startIndex, endIndex).findIndex((lead) => !lead.isNewLead);
</script>

<div class="text-sm mb-2">
	<span class="font-semibold">Avg. Lead Time Elapsed:</span>
	<span class="">{timeToText(avgLeadTimeElapsed)}</span>
</div>

<div class="flex justify-between items-center">
	<FormControl>
		<div class="flex items-center gap-2">
			Show
			<select class="select select-xs select-bordered" bind:value={tableOpts.show}>
				{#each [10, 25, 50, 100] as show}
					<option value={show}>{show}</option>
				{/each}
			</select>
			Entries
		</div>
	</FormControl>

	<div class="flex gap-4">
		<FormControl>
			<div class="input input-sm input-bordered flex items-center gap-2">
				<input type="text" class="grow" placeholder="Search" bind:value={tableOpts.search} />

				<Icon icon="mdi:search" width={18} />
			</div>
		</FormControl>
		{#if roleType !== 'AGENT'}
			{#if deleteLeadIds === undefined}
				<button
					class="btn btn-sm btn-error"
					on:click={() => {
						if (deleteLeadIds === undefined) deleteLeadIds = [];
						else deleteLeadIds = undefined;
					}}
				>
					Delete Leads
				</button>
			{:else}
				<div class="flex gap-4">
					<button class="btn btn-sm btn-warning" on:click={() => (deleteLeadIds = undefined)}>
						<Icon icon="mdi:close" width={20} />
					</button>
					<button class="btn btn-sm btn-error {deleteLeadIds.length === 0 && 'btn-disabled'}" on:click={deleteLeads}>
						<Icon icon="mdi:delete" width={20} />
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<div class="overflow-x-auto my-3">
	<table class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				{#if deleteLeadIds !== undefined}
					<th class="w-1" />
				{/if}
				<th>Prospect ID</th>
				<th>Vonage GUID</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Created On</th>
				<th>Updated On</th>
				<th><div class="text-center">Lead Time<br />Elapsed</div></th>
				<th>Customer</th>
				<th>Lead Status</th>
				<th><div class="text-center">Actions</div></th>
			</tr>
		</thead>
		<tbody>
			{#each displayLeads.slice(startIndex, endIndex) as { id, VonageGUID, createdAt, updatedAt, ProspectKey, isNewLead, isPicked, prospectDetails: { ProspectId, CompanyName, CustomerName, CustomerAddress }, rule, notificationProcess, notificationProcessName, disposition, callUser }, i}
				{@const disableViewLead =
					(roleType === 'AGENT' &&
						callUser?.UserKey !== UserKey &&
						(isNewLead
							? i !== agentFirstNewLead
							: notificationProcess?.createdAt.toLocaleDateString() !== today.toLocaleDateString())) ||
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
						{#if i == 0 && displayLeads.slice(startIndex, endIndex).filter((lead) => lead.isNewLead).length > 0}
							<td colspan="12" class="text-center bg-success text-success-content bg-opacity-90 font-semibold">
								New Leads
							</td>
						{:else}
							<td colspan="12" class="text-center bg-info text-info-content bg-opacity-90 font-semibold">
								Callback Leads
							</td>
						{/if}
					</tr>
				{/if}
				<tr class="hover">
					{#if deleteLeadIds !== undefined}
						<td class="w-1">
							<FormControl>
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-error"
									checked={deleteLeadIds.includes(id)}
									on:click={() => {
										if (deleteLeadIds)
											if (deleteLeadIds.includes(id)) deleteLeadIds = deleteLeadIds.filter((leadId) => leadId !== id);
											else deleteLeadIds = [...deleteLeadIds, id];
									}}
								/>
							</FormControl>
						</td>
					{/if}
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
					<td class="text-center">
						<div>{createdAt.toLocaleDateString()}</div>
						<div>{createdAt.toLocaleTimeString()}</div>
					</td>
					<td class="text-center">
						<div>{updatedAt.toLocaleDateString()}</div>
						<div>{updatedAt.toLocaleTimeString()}</div>
					</td>
					<td class="text-center">{getTimeElapsedText(createdAt, today)}</td>
					<td>
						<div>{CustomerName ?? 'N/A'}</div>
						<div class="text-xs">{CustomerAddress ?? 'N/A'}</div>
					</td>
					<td>
						<div class="font-semibold whitespace-nowrap">{notificationProcessName[0]}</div>
						<div class="font-semibold whitespace-nowrap">{notificationProcessName[1]}</div>
						<div class="">
							{#if notificationProcess}
								{#if isPicked}
									Picked by {callUser?.userStr}
								{:else if notificationProcess.status === 'SCHEDULED'}
									Scheduled in {getTimeElapsedText(today, notificationProcess.createdAt)}
								{:else if notificationProcess.escalations.length > 0}
									Escalation #{notificationProcess.escalations[0].escalation?.num}
								{:else if notificationProcess.notificationAttempts.length > 0}
									Attempt #{notificationProcess.notificationAttempts[0].attempt?.num}
								{/if}
							{/if}
						</div>
						{#if disposition}
							<div class="opacity-75 text-xs">(Disposition: {disposition})</div>
						{/if}
					</td>
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
			{:else}
				<tr><td colspan="13" class="text-center">No Leads Found</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="flex justify-between items-center">
	<div>Showing {startIndex + 1} to {endIndex} entries</div>
	<div class="join">
		<button
			class="btn btn-sm {tableOpts.page === 1 && 'btn-disabled'} join-item"
			on:click={() => (tableOpts = { ...tableOpts, page: tableOpts.page - 1 })}
		>
			<Icon icon="mdi:navigate-before" width={18} />
		</button>
		<button class="btn btn-sm no-animation join-item">Page {tableOpts.page}</button>
		<button
			class="btn btn-sm
         {tableOpts.page >= displayLeads.length / tableOpts.show && 'btn-disabled'} join-item"
			on:click={() => (tableOpts = { ...tableOpts, page: tableOpts.page + 1 })}
		>
			<Icon icon="mdi:navigate-next" width={18} />
		</button>
	</div>
</div>
