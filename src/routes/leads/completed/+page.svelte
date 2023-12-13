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
		interval = setInterval(() => invalidateAll(), 2000);
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
					<th>id</th>
					<th>Prospect Key</th>
					<th>Created On</th>
					<th>Completed On</th>
					<th>Company Name</th>
					<th>Rule Name</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each leads as { id, ProspectKey, createdAt, updatedAt, companyName, ruleName, status }}
					<tr class="hover">
						<td>{id}</td>
						<td>{ProspectKey}</td>
						<td>{createdAt.toLocaleString()}</td>
						<td>{updatedAt.toLocaleString()}</td>
						<td>{companyName}</td>
						<td>{ruleName}</td>
						<td>{status}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
