<script lang="ts">
	import type { LdLeadHistory } from '@prisma/client';
	import LeadHistoryModal from './LeadHistoryModal.svelte';
	import Icon from '@iconify/svelte';
	import { auth } from '../../../stores/auth.store';
	import { ui } from '../../../stores/ui.store';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { onMount } from 'svelte';
	import DataTable from 'datatables.net-dt';

	type QueuedLead = inferProcedureOutput<AppRouter['lead']['getQueued']>['queuedLeads'][number];

	export let queuedLeads: QueuedLead[];
	let viewHistory: LdLeadHistory[] | undefined;

	onMount(() => {
		if (queuedLeads.length > 0) new DataTable('#queuedLeadsTable');
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
			{#each queuedLeads as { ProspectId, VonageGUID, ProspectKey, createdAt, updatedAt, companyName, customerDetails, ruleName, status, history }, i}
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
					<td>{customerDetails.Name}</td>
					<td>{customerDetails.Address}</td>
					<td>{companyName}</td>
					<td>{ruleName}</td>
					<td>{status}</td>
					<td class="text-center">
						{convertSecondsToHMS(Math.floor((new Date().getTime() - createdAt.getTime()) / 1000))}
					</td>
					<td>
						<div class="flex justify-center items-center gap-2">
							<button class="btn btn-xs btn-primary h-fit py-1 animate-none" on:click={() => (viewHistory = history)}>
								<Icon icon="mdi:history" width={18} />
							</button>
							<button
								class="btn btn-xs btn-success {i !== 0 &&
									!auth.isSupervisor() &&
									'btn-disabled'} h-fit py-1 flex gap-2 animate-none"
								on:click={() =>
									ui.navigate(
										`/view-lead?keys=${ProspectKey},${$auth.user?.UserKey}&IsSupervisor=${auth.isSupervisor()}`
									)}
							>
								<Icon icon="mdi:arrow-right" width={18} />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<LeadHistoryModal {viewHistory} />
