<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import type { LdLeadHistory } from '@prisma/client';
	import LeadHistoryModal from './LeadHistoryModal.svelte';
	import Icon from '@iconify/svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';

	type CompletedLead = inferProcedureOutput<AppRouter['lead']['getCompleted']>['completedLeads'][number];

	export let completedLeads: CompletedLead[];
	let viewHistory: LdLeadHistory[] | undefined;

	onMount(async () => {
		new DataTable('#completedLeadsTable', { language: { emptyTable: '', zeroRecords: '' } });
	});
	afterUpdate(async () => {
		new DataTable('#completedLeadsTable');
	});

	const convertSecondsToHMS = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;

		let formattedTime = '';
		if (hours > 0) formattedTime += `${hours} hrs`;
		if (minutes > 0) formattedTime += `${formattedTime.length > 0 ? ', ' : ''}${minutes} mins`;
		if (remainingSeconds > 0 || formattedTime === '')
			formattedTime += `${formattedTime.length > 0 ? ', ' : ''}${remainingSeconds} secs`;

		return formattedTime;
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
						{convertSecondsToHMS(Math.floor((updatedAt.getTime() - createdAt.getTime()) / 1000))}
					</td>
					<td>
						<div class="flex justify-center items-center">
							<button class="btn btn-xs btn-primary h-fit py-1" on:click={() => (viewHistory = history)}>
								<Icon icon="mdi:history" width={16} />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<LeadHistoryModal {viewHistory} />
