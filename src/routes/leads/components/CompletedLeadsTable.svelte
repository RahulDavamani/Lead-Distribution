<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { ui } from '../../../stores/ui.store';
	import { onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import { getTimeElapsed, getTimeElapsedText, timeToText } from '$lib/client/DateTime';

	type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>['completedLeads'][number];

	export let completedLeads: CompletedLead[];
	export let leadDetailsModelId: string | undefined;
	$: avgLeadResponseTime =
		completedLeads.length > 0
			? Math.floor(
					completedLeads.reduce((acc, cur) => acc + getTimeElapsed(cur.createdAt, cur.updatedAt), 0) /
						completedLeads.length
				)
			: 0;

	$: avgCustomerTalkTime =
		completedLeads.length > 0
			? Math.floor(completedLeads.reduce((acc, cur) => acc + cur.customerTalkTime, 0) / completedLeads.length)
			: 0;

	onMount(() => {
		new DataTable('#completedLeadsTable', { order: [] });
	});
</script>

<div class="overflow-x-auto">
	<div class="flex justify-center text-sm">
		<div>
			<span class="font-semibold">Avg. Lead Response Time:</span>
			<span class="">{timeToText(avgLeadResponseTime)}</span>
		</div>
		<div class="divider divider-horizontal" />
		<div>
			<span class="font-semibold">Avg. Customer Talk Time:</span>
			<span class="">{timeToText(avgCustomerTalkTime)}</span>
		</div>
	</div>

	<table id="completedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th class="w-1">Prospect ID</th>
				<th class="w-1">Vonage GUID</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th class="w-1">Created On</th>
				<th class="w-1">Completed On</th>
				<th>Lead Response Time</th>
				<th>Customer Talk Time</th>
				<th class="w-32">Customer</th>
				<th>Close Status</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each completedLeads as { id, VonageGUID, createdAt, updatedAt, prospectDetails: { ProspectId, CompanyName, CustomerName, CustomerAddress }, rule, closeStatus, customerTalkTime }}
				<tr class="hover">
					<td>
						<div class="flex justify-center items-center gap-2">
							{#if closeStatus}
								<div class="badge badge-sm badge-error">
									<Icon icon="mdi:close" />
								</div>
							{:else}
								<div class="badge badge-sm badge-success">
									<Icon icon="mdi:check" />
								</div>
							{/if}
							{ProspectId}
						</div>
					</td>
					<td
						class="text-center {VonageGUID && 'text-primary cursor-pointer hover:underline'}'}"
						on:click={() => {
							if (VonageGUID) ui.navigate(`/vonage-call-details?Guid=${VonageGUID}`);
						}}
					>
						{VonageGUID ?? 'N/A'}
					</td>
					<td>{CompanyName ?? 'N/A'}</td>
					<td>{rule?.name ?? 'N/A'}</td>
					<td class="text-center">{createdAt.toLocaleString().replaceAll(',', '')}</td>
					<td class="text-center">{updatedAt.toLocaleString().replaceAll(',', '')}</td>
					<td class="text-center">{getTimeElapsedText(createdAt, updatedAt)}</td>
					<td class="text-center">{timeToText(customerTalkTime)}</td>
					<td>
						<div>{CustomerName ?? 'N/A'}</div>
						<div class="text-xs">{CustomerAddress ?? 'N/A'}</div>
					</td>
					<td>{closeStatus ?? 'N/A'}</td>
					<td>
						<div class="flex justify-center items-center">
							<button class="btn btn-xs btn-primary h-fit py-1" on:click={() => (leadDetailsModelId = id)}>
								<Icon icon="mdi:information-variant" width={18} />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
