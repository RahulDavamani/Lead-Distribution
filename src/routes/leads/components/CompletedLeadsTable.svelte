<script lang="ts">
	import { afterUpdate, tick } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import type { PageData } from '../$types';
	import type { LdLeadHistory } from '@prisma/client';
	import LeadHistoryModal from './LeadHistoryModal.svelte';
	import Icon from '@iconify/svelte';

	export let completedLeads: PageData['completedLeads'];
	let viewHistory: LdLeadHistory[] | undefined;

	afterUpdate(async () => {
		await tick();
		new DataTable('#completedLeadsTable');
	});

	const secondsToMinsSec = (seconds: number): string => {
		const mins: number = Math.floor(seconds / 60);
		const remainingSec: number = seconds % 60;
		return `${mins} mins ${remainingSec} sec`;
	};
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
			{#each completedLeads as { ProspectId, VonageGUID, createdAt, updatedAt, companyName, customerDetails, ruleName, operatorName, status, history }}
				<tr class="hover">
					<td class="text-center">{ProspectId}</td>
					<td class="text-center">{VonageGUID ?? 'N/A'}</td>
					<td>{createdAt.toLocaleString()}</td>
					<td>{updatedAt.toLocaleString()}</td>
					<td>{customerDetails.Name}</td>
					<td>{customerDetails.Address}</td>
					<td>{companyName}</td>
					<td>{ruleName}</td>
					<td>{operatorName}</td>
					<td>{status}</td>
					<td class="text-center">
						{secondsToMinsSec(Math.floor((updatedAt.getTime() - createdAt.getTime()) / 1000))}
					</td>
					<td class="flex justify-center">
						<button class="btn btn-xs btn-primary h-fit py-1" on:click={() => (viewHistory = history)}>
							<Icon icon="mdi:history" width={16} />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<LeadHistoryModal {viewHistory} />
