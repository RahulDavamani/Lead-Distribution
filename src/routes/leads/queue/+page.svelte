<script lang="ts">
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import DataTable, { type Api } from 'datatables.net-dt';
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
		new DataTable('#queuedLeadsTable');
	});
</script>

<div class="container mx-auto my-10">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold flex items-end gap-2">
			Queued Leads:
			<span class="font-normal font-mono text-2xl">({leads.length})</span>
		</h1>
		<a href="/leads/completed" class="btn btn-sm btn-success"> View Completed Leads </a>
	</div>
	<div class="divider mt-1" />

	<div class="overflow-x-auto">
		<table id="queuedLeadsTable" class="table table-zebra border">
			<thead class="bg-base-200">
				<tr>
					<th>Prospect Key</th>
					<th>Created On</th>
					<th>Updated On</th>
					<th>Affiliate</th>
					<th>Rule</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each leads as { id, ProspectKey, createdAt, updatedAt, companyName, ruleName, status }}
					<tr class="hover">
						<td>{ProspectKey}</td>
						<td>{createdAt.toLocaleString()}</td>
						<td>{updatedAt.toLocaleString()}</td>
						<td>{companyName ?? 'N/A'}</td>
						<td>{ruleName ?? 'N/A'}</td>
						<td>{status}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
