<script lang="ts">
	import { afterUpdate } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import type { PageData } from '../$types';
	import type { LdLeadHistory } from '@prisma/client';
	import LeadHistoryModal from './LeadHistoryModal.svelte';
	import Icon from '@iconify/svelte';

	export let queuedLeads: PageData['queuedLeads'];
	let viewHistory: LdLeadHistory[] | undefined;

	afterUpdate(() => {
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
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Status</th>
				<th>Time Elapsed</th>
				<th></th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each queuedLeads as { ProspectId, VonageGUID, ProspectKey, createdAt, updatedAt, companyName, ruleName, status, history, ruleUserId }}
				<tr class="hover">
					<td class="text-center">{ProspectId}</td>
					<td class="text-center">{VonageGUID ?? 'N/A'}</td>
					<td>{createdAt.toLocaleString()}</td>
					<td>{updatedAt.toLocaleString()}</td>
					<td>{companyName}</td>
					<td>{ruleName}</td>
					<td>{status}</td>
					<td class="text-center">
						{secondsToMinsSec(Math.floor((new Date().getTime() - createdAt.getTime()) / 1000))}
					</td>
					<td>
						<button class="btn btn-xs btn-primary h-fit py-1 flex gap-2" on:click={() => (viewHistory = history)}>
							<Icon icon="mdi:history" />
							View History
						</button>
					</td>
					<td>
						<a
							href={`/view-lead?ProspectKey=${ProspectKey}&UserId=${ruleUserId}`}
							class="btn btn-xs btn-success h-fit py-1 flex gap-2"
						>
							<Icon icon="mdi:arrow-right" width={16} />
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<LeadHistoryModal {viewHistory} />
