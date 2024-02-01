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
				<th class="w-1">Prospect ID</th>
				<th class="w-1">Vonage GUID</th>
				<th class="w-1">Created On</th>
				<th class="w-1">Updated On</th>
				<th class="w-32">Customer</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Close Status</th>
				<th>Response Time</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each completedLeads as { id, VonageGUID, createdAt, updatedAt, prospectDetails: { ProspectId, CompanyName, CustomerName, CustomerAddress }, rule, closeStatus }}
				<tr class="hover">
					<td>
						<div class="flex justify-center items-center gap-2">
							{#if closeStatus}
								<div class="badge badge-sm badge-error" />
							{:else}
								<div class="badge badge-sm badge-success" />
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
					<td class="text-center">{createdAt.toLocaleString().replaceAll(',', '')}</td>
					<td class="text-center">{updatedAt.toLocaleString().replaceAll(',', '')}</td>
					<td>
						<div>{CustomerName ?? 'N/A'}</div>
						<div class="text-xs">{CustomerAddress ?? 'N/A'}</div>
					</td>
					<td>{CompanyName ?? 'N/A'}</td>
					<td>{rule?.name ?? 'N/A'}</td>
					<td>{closeStatus ?? 'N/A'}</td>
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
