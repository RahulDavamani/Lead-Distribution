<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ui } from '../../../stores/ui.store';
	import { calculateLeadDuration, getTimeElapsedText, timeToText } from '$lib/client/DateTime';
	import Flatpickr from 'svelte-flatpickr';
	import FormControl from '../../components/FormControl.svelte';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { auth } from '../../../stores/auth.store';
	import { lead } from '../../../stores/lead.store';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import { goto } from '$app/navigation';

	$: ({ timezone } = $lead);
	$: completedLeads = $lead.completedLeads!;

	let completeStatusSelect: string | undefined;
	$: completeLeadStatuses = completedLeads.reduce(
		(acc, cur) => (acc.includes(cur.completeStatus) ? acc : [...acc, cur.completeStatus]),
		[] as string[]
	);

	$: leadsWithResponseTime = completedLeads.filter(({ leadResponseTime }) => leadResponseTime && leadResponseTime >= 0);
	$: avgLeadResponseTime =
		leadsWithResponseTime.length > 0
			? Math.floor(
					leadsWithResponseTime.reduce((acc, cur) => acc + cur.leadResponseTime!, 0) / leadsWithResponseTime.length
				)
			: 0;

	$: avgCustomerTalkTime =
		completedLeads.length > 0
			? Math.floor(completedLeads.reduce((acc, cur) => acc + cur.customerTalkTime, 0) / completedLeads.length)
			: 0;

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
					onClick: ui.loaderWrapper({ title: 'Deleting Leads' }, async () => {
						$ui.alertModal = undefined;
						if (!deleteLeadIds) return;

						await trpc($page)
							.lead.delete.query({ ids: deleteLeadIds, isCompleted: true })
							.catch(trpcClientErrorHandler);

						ui.setLoader({ title: 'Updating Leads' });
						await lead.fetchCompletedLeads();

						deleteLeadIds = undefined;
					})
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
	$: displayLeads = completedLeads
		.filter((lead) => (completeStatusSelect ? lead.completeStatus === completeStatusSelect : true))
		.filter(
			({ prospect: { ProspectId, CompanyName, CustomerFirstName, CustomerLastName, Phone, Address, ZipCode } }) => {
				const value = [ProspectId, CompanyName, CustomerFirstName, CustomerLastName, Phone, Address, ZipCode]
					.join('')
					.replaceAll(' ', '')
					.toLowerCase();
				const searchValue = tableOpts.search.replaceAll(' ', '').toLowerCase();
				return value.includes(searchValue) && ($lead.affiliate ? CompanyName === $lead.affiliate : true);
			}
		);
</script>

<div class="flex justify-between items-center mb-2">
	<div class="flex text-sm">
		<div>
			<span class="font-semibold">Avg. Lead Response Time :</span>
			<span class="font-mono ml-2">{timeToText(avgLeadResponseTime)}</span>
		</div>
		<div class="divider divider-horizontal" />
		<div>
			<span class="font-semibold">Avg. Customer Talk Time :</span>
			<span class="font-mono ml-2">{timeToText(avgCustomerTalkTime)}</span>
		</div>
	</div>
	<div class="flex flex-grow justify-end gap-4">
		<select
			class="select select-bordered select-sm font-semibold text-center max-w-xs w-full ml-3"
			bind:value={completeStatusSelect}
		>
			<option value={undefined}>All Complete Status</option>
			{#each completeLeadStatuses as completeStatus}
				{@const count = completedLeads.filter((l) => l.completeStatus === completeStatus).length}
				<option value={completeStatus}>
					{completeStatus} ({count})
				</option>
			{/each}
		</select>
		<Flatpickr
			placeholder="Choose Date"
			class="input input-bordered input-sm cursor-pointer font-semibold text-center max-w-xs w-full"
			bind:value={$lead.dateRange}
			on:close={lead.fetchCompletedLeads}
			options={{
				mode: 'range',
				altInput: true,
				altFormat: 'F j, Y',
				dateFormat: 'Y-m-d',
				allowInput: true
			}}
		/>
	</div>
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

		{#if $auth.roleType !== 'AGENT' && !$lead.viewMode}
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
				<th class="w-1">Prospect ID</th>
				<th class="w-1">Vonage GUID</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th class="w-1">Created On</th>
				<th class="w-1">Completed On</th>
				<th>Lead Duration</th>
				<th>Lead Response Time</th>
				<th>Customer Talk Time</th>
				<th class="w-32">Customer</th>
				<th class="w-32">Company</th>
				<th>Complete Status</th>
				<th>Completed/Closed By</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each displayLeads.slice(startIndex, endIndex) as { id, VonageGUID, createdAt, updatedAt, prospect, company, rule, success, completeStatus, customerTalkTime, user, leadResponseTime }}
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
							{#if success}
								<div class="badge badge-sm badge-success">
									<Icon icon="mdi:check" />
								</div>
							{:else}
								<div class="badge badge-sm badge-error">
									<Icon icon="mdi:close" />
								</div>
							{/if}
							{prospect.ProspectId}
						</div>
					</td>
					<td
						class="text-center {VonageGUID && 'text-primary cursor-pointer hover:underline'}'}"
						on:click={() => {
							if (VonageGUID) goto(`/vonage-call-details?Guid=${VonageGUID}`);
						}}
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
							? timeToText(calculateLeadDuration(createdAt, updatedAt, company))
							: getTimeElapsedText(createdAt, updatedAt)}
					</td>
					<td class="text-center">{leadResponseTime ? timeToText(leadResponseTime) : 'N/A'}</td>

					<td class="text-center">{timeToText(customerTalkTime)}</td>
					<td>
						<div>{prospect.CustomerFirstName} {prospect.CustomerLastName}</div>
						<div class="text-xs">{prospect.Address} {prospect.ZipCode}</div>
					</td>
					<td>{company?.CompanyName ?? 'All'}</td>

					<td>{completeStatus ?? 'N/A'}</td>
					<td>{user ?? 'N/A'}</td>
					<td>
						<div class="flex justify-center items-center gap-2">
							<button
								class="btn btn-xs btn-primary h-fit py-1"
								on:click={() => ui.setModals({ leadDetailsModelId: id })}
							>
								<Icon icon="mdi:information-variant" width={18} />
							</button>
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
