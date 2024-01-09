<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { ui } from '../../../stores/ui.store';
	import { onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import { getTimeElapsedText } from '$lib/client/DateTime';

	type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>['completedLeads'][number];

	export let completedLeads: CompletedLead[];
	export let leadDetailsModelId: string | undefined;

	onMount(() => {
		new DataTable('#completedLeadsTable');
	});
</script>

<div class="overflow-x-auto">
	<table id="completedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th>Prospect ID</th>
				<th>Vonage GUID</th>
				<th>Created On</th>
				<th>Completed On</th>
				<th>Customer Name</th>
				<th>Customer Address</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Operator</th>
				<th>Status</th>
				<th>Response Time</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each completedLeads as { id, ProspectId, VonageGUID, createdAt, updatedAt, CustomerName, CustomerAddress, CompanyName, operatorName, status, rule }}
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
					<td>{CustomerName ?? 'N/A'}</td>
					<td>{CustomerAddress ?? 'N/A'}</td>
					<td>{CompanyName ?? 'N/A'}</td>
					<td>{rule?.name ?? 'N/A'}</td>
					<td>{operatorName ?? 'N/A'}</td>
					<td>{status}</td>
					<td class="text-center">{getTimeElapsedText(createdAt, updatedAt)}</td>
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
