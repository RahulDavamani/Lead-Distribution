<script lang="ts">
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;
	$: ({ leads } = data);
	let interval: NodeJS.Timeout | undefined;
	onMount(() => {
		interval = setInterval(() => invalidateAll(), 1000);
	});
	onDestroy(() => {
		clearInterval(interval);
	});

	afterUpdate(() => {
		new DataTable('#completedLeadsTable');
	});
</script>

<div class="container mx-auto my-10">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold flex items-end gap-2">
			Completed Leads:
			<span class="font-normal font-mono text-2xl">({leads.length})</span>
		</h1>
		<a href="/leads/queue" class="btn btn-sm btn-warning">View Queued Leads </a>
	</div>
	<div class="divider mt-1" />

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
				{#each leads as { ProspectKey, createdAt, updatedAt, companyName, ruleName, status, operatorName }}
					<tr class="hover">
						<td>{ProspectKey}</td>
						<td>{createdAt.toLocaleString()}</td>
						<td>{updatedAt.toLocaleString()}</td>
						<td>{companyName}</td>
						<td>{ruleName}</td>
						<td>{status}</td>
						<td>{operatorName ?? 'N/A'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
