<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '../../components/Modal.svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import Loader from '../../components/Loader.svelte';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';

	type LeadHistory = inferProcedureOutput<AppRouter['lead']['getHistoryAndAttempts']>['history'][number];
	type LeadAttempt = inferProcedureOutput<AppRouter['lead']['getHistoryAndAttempts']>['attempts'][number];

	export let id: string | undefined;
	let history: LeadHistory[] | undefined;
	let attempts: LeadAttempt[] | undefined;

	const fetchHistoryAndAttempts = async (id: string) => {
		const lead = await trpc($page).lead.getHistoryAndAttempts.query({ id });
		history = lead.history.map(({ createdAt, updatedAt, ...values }) => ({
			createdAt: new Date(createdAt),
			updatedAt: new Date(updatedAt),
			...values
		}));
		attempts = lead.attempts.map(({ createdAt, updatedAt, ...values }) => ({
			createdAt: new Date(createdAt),
			updatedAt: new Date(updatedAt),
			...values
		}));
	};

	const clearHistoryAndAttempts = () => {
		history = undefined;
		attempts = undefined;
	};
	$: id ? fetchHistoryAndAttempts(id) : clearHistoryAndAttempts();
</script>

{#if id}
	<Modal
		title="Lead Details"
		showModal={id !== undefined}
		closeModal={() => (id = undefined)}
		boxClasses="max-w-6xl w-full"
	>
		{#if history && attempts}
			<div class="grid grid-cols-5 gap-4">
				<div class="overflow-x-auto col-span-2">
					<div class="text-lg font-semibold mb-1">Lead Status History:</div>
					<div class="table table-zebra border rounded-none">
						<thead class="bg-base-200">
							<tr>
								<th>Date Time</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each history as { createdAt, status }}
								<tr>
									<td>{createdAt.toLocaleString()}</td>
									<td>{status}</td>
								</tr>
							{/each}
						</tbody>
					</div>
				</div>

				<div class="overflow-x-auto col-span-3">
					<div class="text-lg font-semibold mb-1">Notification Attempts:</div>
					<div class="table table-zebra border rounded-none">
						<thead class="bg-base-200">
							<tr>
								<th>Date Time</th>
								<th>Operator</th>
								<th>Message</th>
							</tr>
						</thead>
						<tbody>
							{#each attempts as { createdAt, UserId, name, message }}
								<tr>
									<td>{createdAt.toLocaleString()}</td>
									<td>{UserId} - {name}</td>
									<td>{message}</td>
								</tr>
							{:else}
								<tr>
									<td class="text-center" colspan={3}>No Attempts Found</td>
								</tr>
							{/each}
						</tbody>
					</div>
				</div>
			</div>
		{:else}
			<div class="my-10">
				<Loader title="Fetching Lead History" size={80} overlay={false} center={false} />
			</div>
		{/if}
	</Modal>
{/if}
