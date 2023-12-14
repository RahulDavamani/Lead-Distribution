<script lang="ts">
	import { afterUpdate } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import type { PageData } from '../$types';

	export let completedLeads: PageData['completedLeads'];

	afterUpdate(() => {
		new DataTable('#completedLeadsTable');
	});
</script>

<div class="overflow-x-auto">
	<table id="completedLeadsTable" class="table table-zebra border">
		<thead class="bg-base-200">
			<tr>
				<th>Prospect Key</th>
				<th>Created On</th>
				<th>Completed On</th>
				<th>Affiliate</th>
				<th>Rule</th>
				<th>Status</th>
				<th>Operator</th>
			</tr>
		</thead>
		<tbody>
			{#each completedLeads as { ProspectKey, createdAt, updatedAt, companyName, ruleName, status, operatorName }}
				<tr class="hover">
					<td>{ProspectKey}</td>
					<td>{createdAt.toLocaleString()}</td>
					<td>{updatedAt.toLocaleString()}</td>
					<td>{companyName}</td>
					<td>{ruleName}</td>
					<td>{status}</td>
					<td>{operatorName}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
