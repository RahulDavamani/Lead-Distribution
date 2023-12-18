<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import type { PageData } from '../$types';
	import type { LdLeadHistory } from '@prisma/client';
	import LeadHistoryModal from './LeadHistoryModal.svelte';
	import Icon from '@iconify/svelte';
	import { auth } from '../../../stores/auth.store';

	export let queuedLeads: PageData['queuedLeads'];
	let viewHistory: LdLeadHistory[] | undefined;

	onMount(async () => {
		new DataTable('#queuedLeadsTable', { language: { emptyTable: '', zeroRecords: '' } });
	});
	afterUpdate(async () => {
		new DataTable('#queuedLeadsTable');
	});

	const secondsToMinsSec = (seconds: number): string => {
		const mins: number = Math.floor(seconds / 60);
		const remainingSec: number = seconds % 60;
		return `${mins} mins ${remainingSec} sec`;
	};
</script>

<div class="overflow-x-auto">
	<table id="queuedLeadsTable" class="table table-zebra border rounded-t-none">
		<thead class="bg-base-300">
			<tr>
				<th>Prospect ID</th>
				<th>Vonage GUID</th>
				<th>Created On</th>
				<th>Updated On</th>
				<th>Customer Name</th>
				<th>Customer Address</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Status</th>
				<th>Time Elapsed</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each queuedLeads as { ProspectId, VonageGUID, ProspectKey, createdAt, updatedAt, companyName, customerDetails, ruleName, status, history, ruleUserId }, i}
				<tr class="hover">
					<td class="text-center">{ProspectId}</td>
					<td class="text-center">{VonageGUID ?? 'N/A'}</td>
					<td>{createdAt.toLocaleString()}</td>
					<td>{updatedAt.toLocaleString()}</td>
					<td>{customerDetails.Name}</td>
					<td>{customerDetails.Address}</td>
					<td>{companyName}</td>
					<td>{ruleName}</td>
					<td>{status}</td>
					<td class="text-center">
						{secondsToMinsSec(Math.floor((new Date().getTime() - createdAt.getTime()) / 1000))}
					</td>
					<td>
						<div class="flex justify-center items-center gap-2">
							<button class="btn btn-xs btn-primary h-fit py-1" on:click={() => (viewHistory = history)}>
								<Icon icon="mdi:history" width={16} />
							</button>
							<button
								class="btn btn-xs btn-success {i !== 0 && !auth.isSupervisor() && 'btn-disabled'} h-fit py-1 flex gap-2"
								on:click={() => (window.location.href = `/view-lead?ProspectKey=${ProspectKey}&UserId=${ruleUserId}`)}
							>
								<Icon icon="mdi:arrow-right" width={16} />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<LeadHistoryModal {viewHistory} />
