<script lang="ts">
	import Icon from '@iconify/svelte';
	import { auth } from '../../../stores/auth.store';
	import { ui } from '../../../stores/ui.store';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { calculateLeadDuration, getTimeElapsedText, timeToText } from '$lib/client/DateTime';
	import FormControl from '../../components/FormControl.svelte';
	import { lead } from '../../../stores/lead.store';
	import { getProcessNameSplit } from '$lib/getProcessName';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import { goto } from '$app/navigation';

	$: ({ today, timezone } = $lead);
	$: queuedLeads = $lead.queuedLeads!;

	$: ({
		user: { UserKey },
		roleType
	} = $auth);

	$: leadsWithResponseTime = queuedLeads.filter(({ leadResponseTime }) => leadResponseTime && leadResponseTime >= 0);
	$: avgLeadResponseTime =
		leadsWithResponseTime.length > 0
			? Math.floor(
					leadsWithResponseTime.reduce((acc, cur) => acc + cur.leadResponseTime!, 0) / leadsWithResponseTime.length
				)
			: 0;

	const requeue = async (ProspectKey: string) => {
		ui.setLoader({ title: 'Requeueing Lead' });
		const interval = setInterval(() => {
			if (queuedLeads.find((lead) => ProspectKey === lead.ProspectKey)?.notificationProcesses[0]?.status === 'ACTIVE') {
				ui.setLoader();
				clearInterval(interval);
			}
		}, 500);
		await trpc($page).lead.requeue.query({ ProspectKey, UserKey }).catch(trpcClientErrorHandler);
	};

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
					classes: 'btn-error',
					onClick: () => ($ui.alertModal = undefined)
				},
				{
					name: 'Requeue',
					classes: 'btn-warning',
					onClick: async () => {
						$ui.alertModal = undefined;
						await requeue(ProspectKey);
					}
				}
			]
		};
	};

	let deleteLeadIds: string[] | undefined;
	const deleteLeads = () => {
		$ui.alertModal = {
			title: 'Are you sure to delete these leads?',
			body: 'This action cannot be undone',
			actions: [
				{
					name: 'Cancel',
					classes: 'btn-warning',
					onClick: () => ($ui.alertModal = undefined)
				},
				{
					name: 'Delete',
					classes: 'btn-error',
					onClick: ui.loaderWrapper({ title: 'Deleting lead' }, async () => {
						$ui.alertModal = undefined;
						if (!deleteLeadIds) return;

						await trpc($page)
							.lead.delete.query({ ids: deleteLeadIds, isCompleted: false })
							.catch(trpcClientErrorHandler);

						$lead.queuedLeads = queuedLeads.filter((lead) => !deleteLeadIds?.includes(lead.id));
						deleteLeadIds = undefined;
					})
				}
			]
		};
	};

	let showNewLeads = true;
	let showCallbackLeads = true;
	let tableOpts = {
		search: '',
		page: 1,
		show: 10
	};
	$: startIndex = (tableOpts.page - 1) * tableOpts.show;
	$: endIndex = startIndex + tableOpts.show;
	$: searchLeads = queuedLeads.filter(
		({ prospect: { ProspectId, CompanyName, CustomerFirstName, CustomerLastName, Phone, Address, ZipCode } }) => {
			const value = [ProspectId, CompanyName, CustomerFirstName, CustomerLastName, Phone, Address, ZipCode]
				.join('')
				.replaceAll(' ', '')
				.toLowerCase();
			const searchValue = tableOpts.search.replaceAll(' ', '').toLowerCase();
			return value.includes(searchValue) && ($lead.affiliate ? CompanyName === $lead.affiliate : true);
		}
	);
	$: displayLeads = searchLeads.filter(({ isNewLead }) => (isNewLead ? showNewLeads : showCallbackLeads));
	$: firstCallback = displayLeads.slice(startIndex, endIndex).findIndex((lead) => !lead.isNewLead);
</script>

<div class="flex text-sm mb-4 gap-8">
	<button
		class="btn btn-sm btn-outline btn-primary {!showNewLeads && 'btn-disabled pointer-events-auto'}"
		on:click={() => (showNewLeads = !showNewLeads)}
	>
		<span>New Leads :</span>
		<span class="font-mono">{searchLeads.filter(({ isNewLead }) => isNewLead).length}</span>
	</button>
	<button
		class="btn btn-sm btn-outline btn-primary {!showCallbackLeads && 'btn-disabled pointer-events-auto'}"
		on:click={() => (showCallbackLeads = !showCallbackLeads)}
	>
		<span>Callback Leads :</span>
		<span class="font-mono">{searchLeads.filter(({ isNewLead }) => !isNewLead).length}</span>
	</button>
</div>

<div class="text-sm mb-2">
	<span class="font-semibold">Avg. Lead Time Elapsed :</span>
	<span class="font-mono ml-2">{timeToText(avgLeadResponseTime)}</span>
</div>

<div class="flex justify-between items-center">
	<FormControl>
		<div class="flex items-center gap-2">
			Show
			<select class="select select-xs select-bordered" bind:value={tableOpts.show}>
				{#each [5, 10, 25, 50, 100] as show}
					<option value={show}>{show}</option>
				{/each}
			</select>
			of
			<span class="font-mono">{displayLeads.length}</span>
			entries
		</div>
	</FormControl>

	<div class="flex gap-4">
		<FormControl>
			<div class="input input-sm input-bordered flex items-center gap-2">
				<input type="text" class="grow" placeholder="Search" bind:value={tableOpts.search} />

				<Icon icon="mdi:search" width={18} />
			</div>
		</FormControl>
		{#if roleType !== 'AGENT' && !$lead.viewMode}
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
				<th class="w-40">Vonage GUID</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Created On</th>
				<th>Updated On</th>
				<th><div class="text-center">Lead Duration</div></th>
				<th><div class="text-center">Lead Response<br />Time</div></th>
				<th>Customer</th>
				<th class="w-32">Company</th>
				<th>Lead Status</th>
				<th><div class="text-center">Actions</div></th>
			</tr>
		</thead>
		<tbody>
			{#each displayLeads.slice(startIndex, endIndex) as { id, VonageGUID, createdAt, updatedAt, ProspectKey, isNewLead, isPicked, prospect, company, rule, notificationProcesses, latestCall, responses, leadResponseTime }, i}
				{@const notificationProcessName = getProcessNameSplit(
					notificationProcesses[0]?.callbackNum ?? 0,
					notificationProcesses[0]?.requeueNum ?? 0
				)}
				{@const disableViewLead =
					(roleType === 'AGENT' &&
						latestCall?.UserKey !== UserKey &&
						(isNewLead ? false : notificationProcesses[0]?.createdAt.toDateString() !== today.toDateString())) ||
					(isPicked ? latestCall?.UserKey !== UserKey : false)}

				{@const canRequeue =
					roleType === 'ADMIN' ||
					(roleType === 'SUPERVISOR' && rule?.supervisors.find((s) => s.UserKey === UserKey)?.isRequeue)}

				{@const statusBtnEnable =
					roleType === 'AGENT'
						? isPicked
							? false
							: true
						: notificationProcesses[0]?.status === 'ACTIVE'
							? false
							: canRequeue}

				{@const statusBtnText =
					roleType === 'AGENT'
						? isPicked
							? 'Lead Picked'
							: 'Available'
						: notificationProcesses[0]?.status === 'ACTIVE'
							? 'Queueing'
							: 'Requeue'}

				{@const statusBtnClick = () => {
					if (canRequeue)
						if (isPicked) showRequeueAlert(ProspectKey, 'picked');
						else if (notificationProcesses[0]?.status === 'SCHEDULED') showRequeueAlert(ProspectKey, 'scheduled');
						else requeue(ProspectKey);
				}}

				{#if i === 0 || i === firstCallback}
					{@const colspan = 13 + (deleteLeadIds ? 1 : 0) + ($lead.viewMode ? -1 : 0)}
					<tr class="hover">
						{#if i == 0 && displayLeads.slice(startIndex, endIndex).filter((lead) => lead.isNewLead).length > 0}
							<td {colspan} class="text-center bg-success text-success-content bg-opacity-90 font-semibold">
								New Leads
							</td>
						{:else}
							<td {colspan} class="text-center bg-info text-info-content bg-opacity-90 font-semibold">
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
							{:else if notificationProcesses[0]?.requeueNum === 0}
								<div class="badge badge-sm bg-orange-400" />
							{:else}
								<div class="badge badge-sm badge-warning" />
							{/if}
							{prospect.ProspectId ?? 'N/A'}
						</div>
					</td>
					<td
						class="text-center text-xs {VonageGUID && 'text-primary cursor-pointer hover:underline'}'}"
						on:click={() => VonageGUID && goto(`/vonage-call-details?Guid=${VonageGUID}`)}
					>
						{VonageGUID ?? 'N/A'}
					</td>
					<td>{prospect.CompanyName ?? 'N/A'}</td>
					<td>{rule?.name ?? 'N/A'}</td>
					<td class="text-center">
						<div>{createdAt.toLocaleDateString('en-US', { timeZone: timezone })}</div>
						<div>{createdAt.toLocaleTimeString('en-US', { timeZone: timezone })}</div>
					</td>
					<td class="text-center">
						<div>{updatedAt.toLocaleDateString('en-US', { timeZone: timezone })}</div>
						<div>{updatedAt.toLocaleTimeString('en-US', { timeZone: timezone })}</div>
					</td>
					<td class="text-center">
						{company
							? timeToText(calculateLeadDuration(createdAt, today, company))
							: getTimeElapsedText(createdAt, today)}
					</td>
					<td class="text-center">{leadResponseTime ? timeToText(leadResponseTime) : 'N/A'}</td>
					<td>
						<div>{prospect.CustomerFirstName ?? ''} {prospect.CustomerLastName ?? ''}</div>
						<div class="text-xs">{prospect.Address ?? ''} {prospect.ZipCode ?? ''}</div>
					</td>
					<td>{company?.CompanyName ?? 'All'} </td>
					<td>
						<div class="font-semibold whitespace-nowrap">{notificationProcessName[0]}</div>
						<div class="font-semibold whitespace-nowrap">{notificationProcessName[1]}</div>
						<div>
							{#if isPicked}
								Picked by {latestCall?.userStr}
							{:else if notificationProcesses[0]}
								{#if notificationProcesses[0].status === 'SCHEDULED'}
									Scheduled in {getTimeElapsedText(today, notificationProcesses[0].createdAt)}
								{:else if notificationProcesses[0].status === 'CANCELLED'}
									Cancelled
								{:else if notificationProcesses[0].escalations.length > 0}
									Escalation #{notificationProcesses[0].escalations[0].num}
								{:else if notificationProcesses[0].notificationAttempts.length > 0}
									Attempt #{notificationProcesses[0].notificationAttempts[0].num}
								{/if}
							{/if}
						</div>

						{#if responses.length}
							<div class="opacity-75 text-xs">(Disposition: {responses[0].responseValue})</div>
						{/if}

						{#if latestCall && VonageGUID}
							{#if latestCall.createdAt < responses[0]?.createdAt}
								<div />
							{:else if today.getTime() - latestCall.createdAt.getTime() > 600000}
								<button
									class="btn btn-link btn-xs whitespace-nowrap p-0 animate-pulse"
									on:click={() => ui.setModals({ updateDispositionModalId: id })}
								>
									Update Disposition
								</button>
							{/if}
						{/if}
					</td>
					<td>
						<div class="flex flex-col justify-center">
							<!-- Status Btn -->
							<button
								class="btn btn-sm {roleType === 'AGENT' ? 'btn-success' : 'btn-warning'} mb-2
                            {!statusBtnEnable && 'btn-disabled'} text-xs"
								on:click={statusBtnClick}
							>
								{statusBtnText}
							</button>

							<div class="flex justify-center items-center gap-2">
								<!-- Lead Details Btn -->
								<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
								<div class="dropdown dropdown-top dropdown-end">
									<div tabindex="0" role="button" class="btn btn-xs btn-info h-fit py-0.5 animate-none">
										<Icon icon="mdi:menu" width={20} />
									</div>
									<ul
										tabindex="0"
										class="p-2 mb-1 border border-gray-400 shadow-2xl menu dropdown-content z-50 bg-base-100 rounded-box w-52"
									>
										<li>
											<button
												on:click={async (e) => {
													e.currentTarget.blur();
													ui.setModals({ leadDetailsModelId: id });
												}}
											>
												<Icon icon="mdi:information-outline" class="text-info" width={22} />
												Lead Details
											</button>
										</li>
										<li>
											<button
												on:click={(e) => {
													e.currentTarget.blur();
													ui.setModals({ scheduleCallbackModalId: id });
												}}
											>
												<Icon icon="mdi:phone-schedule" class="text-primary" width={20} />
												Schedule Callback
											</button>
										</li>
										<li>
											<button
												on:click={(e) => {
													e.currentTarget.blur();
													ui.setModals({ switchCompanyModalId: id });
												}}
											>
												<Icon icon="mdi:swap-horizontal" class="text-secondary" width={22} />
												Switch Company
											</button>
										</li>
										<li>
											<button
												on:click={(e) => {
													e.currentTarget.blur();
													ui.setModals({ notesModalId: id });
												}}
											>
												<Icon icon="mdi:file-document-box" class="text-accent" width={22} />
												Notes
											</button>
										</li>
									</ul>
								</div>

								<!-- View Lead Btn -->
								<button
									class="btn btn-xs btn-success {disableViewLead && 'btn-disabled'}
                               h-fit py-1 flex gap-2 animate-none"
									on:click={() => goto(`/view-lead?ProspectKey=${ProspectKey}`)}
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
