<script lang="ts">
	import Modal from '../../components/Modal.svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import Loader from '../../components/Loader.svelte';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';

	type LeadDetails = inferProcedureOutput<AppRouter['lead']['getLeadDetails']>;

	export let id: string | undefined;
	let leadDetails: LeadDetails | undefined;

	const fetchLeadDetails = async (id: string) => {
		const lead = await trpc($page).lead.getLeadDetails.query({ id });
		leadDetails = {
			ProspectKey: lead.ProspectKey,
			history: lead.history.map(({ createdAt, updatedAt, ...values }) => ({
				createdAt: new Date(createdAt),
				updatedAt: new Date(updatedAt),
				...values
			})),
			attempts: lead.attempts.map(({ createdAt, updatedAt, name, ...values }) => ({
				createdAt: new Date(createdAt),
				updatedAt: new Date(updatedAt),
				name,
				...values
			})),
			calls: lead.calls.map(({ createdAt, updatedAt, name, ...values }) => ({
				createdAt: new Date(createdAt),
				updatedAt: new Date(updatedAt),
				name,
				...values
			})),
			requeues: lead.requeues.map(({ createdAt, updatedAt, supervisorName, dispositionNum, ...values }) => ({
				createdAt: new Date(createdAt),
				updatedAt: new Date(updatedAt),
				supervisorName,
				dispositionNum,
				...values
			})),
			dispositions: lead.dispositions.map(({ createdAt, updatedAt, ...values }) => ({
				createdAt: new Date(createdAt),
				updatedAt: new Date(updatedAt),
				...values
			}))
		};
	};

	$: id ? fetchLeadDetails(id) : (leadDetails = undefined);
</script>

{#if id}
	<Modal
		title="Lead Details"
		showModal={id !== undefined}
		closeModal={() => (id = undefined)}
		boxClasses="max-w-7xl w-full"
	>
		{#if leadDetails}
			<div class="grid grid-cols-7 gap-4">
				<div class="overflow-x-auto col-span-2 row-span-2">
					<div class="text-lg font-semibold mb-1">Lead Status History:</div>
					<div class="table table-zebra table-sm border rounded-none">
						<thead class="bg-base-200">
							<tr>
								<th>Date Time</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each leadDetails.history as { createdAt, status }}
								<tr>
									<td>{createdAt.toLocaleString()}</td>
									<td>{status}</td>
								</tr>
							{/each}
						</tbody>
					</div>
				</div>

				<div class="grid grid-cols-5 col-span-5 gap-4">
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
								{#each leadDetails.attempts as { createdAt, UserId, name, message }}
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

					<div class="overflow-x-auto col-span-2">
						<div class="text-lg font-semibold mb-1">Calls:</div>
						<div class="table table-zebra border rounded-none">
							<thead class="bg-base-200">
								<tr>
									<th>Date Time</th>
									<th>Operator</th>
								</tr>
							</thead>
							<tbody>
								{#each leadDetails.calls as { createdAt, UserId, name }}
									<tr>
										<td>{createdAt.toLocaleString()}</td>
										<td>{UserId} - {name}</td>
									</tr>
								{:else}
									<tr>
										<td class="text-center" colspan={3}>No Calls Found</td>
									</tr>
								{/each}
							</tbody>
						</div>
					</div>

					<div class="overflow-x-auto col-span-3">
						<div class="text-lg font-semibold mb-1">Dispositions:</div>
						<div class="table table-zebra border rounded-none">
							<thead class="bg-base-200">
								<tr>
									<th>Date Time</th>
									<th>Disposition</th>
									<th>Message</th>
								</tr>
							</thead>
							<tbody>
								{#each leadDetails.dispositions as { createdAt, disposition, message }}
									<tr>
										<td>{createdAt.toLocaleString()}</td>
										<td>{disposition}</td>
										<td>{message}</td>
									</tr>
								{:else}
									<tr>
										<td class="text-center" colspan={3}>No Disposition Found</td>
									</tr>
								{/each}
							</tbody>
						</div>
					</div>

					<div class="overflow-x-auto col-span-2">
						<div class="text-lg font-semibold mb-1">Requeue:</div>
						<div class="table table-zebra border rounded-none">
							<thead class="bg-base-200">
								<tr>
									<th>Date Time</th>
									<th>Supervisor / Disposition</th>
								</tr>
							</thead>
							<tbody>
								{#each leadDetails.requeues as { createdAt, UserId, supervisorName, dispositionNum }}
									<tr>
										<td>{createdAt.toLocaleString()}</td>
										<td>
											{#if supervisorName}
												Supervisor: {UserId} - {supervisorName}
											{/if}
											{#if dispositionNum}
												Call Disposition #{dispositionNum}
											{/if}
										</td>
									</tr>
								{:else}
									<tr>
										<td class="text-center" colspan={3}>No Requeues Found</td>
									</tr>
								{/each}
							</tbody>
						</div>
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
