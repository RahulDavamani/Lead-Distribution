<script lang="ts">
	import Modal from '../../components/Modal.svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import Loader from '../../components/Loader.svelte';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { getActionsList } from '$lib/config/utils/getActionsList';

	type LeadDetails = inferProcedureOutput<AppRouter['lead']['getLeadDetails']>;

	export let id: string | undefined;
	let leadDetails: LeadDetails | undefined;

	const fetchLeadDetails = async (id: string) => {
		const type = $page.url.searchParams.get('type') as 'queued' | 'completed';
		leadDetails = await trpc($page).lead.getLeadDetails.query({ id, type });
	};

	$: id ? fetchLeadDetails(id) : (leadDetails = undefined);
</script>

{#if id}
	<Modal
		title="Lead Details {leadDetails?.ProspectId ? `(${leadDetails.ProspectId})` : ''}"
		showModal={id !== undefined}
		closeModal={() => (id = undefined)}
		boxClasses="max-w-full"
	>
		{#if leadDetails}
			<div class="grid grid-cols-6 gap-4">
				<div class="overflow-x-auto col-span-2 row-span-2">
					<div class="text-lg font-semibold mb-1">Lead Logs History:</div>
					<ul class="steps steps-vertical">
						{#each leadDetails.logs as { createdAt, log }}
							<li class="step step-primary my-2">
								<div class="text-left">
									<div class="font-semibold">{log}</div>
									<div class="text-xs">{createdAt.toLocaleString()}</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>

				<div class="grid grid-cols-4 col-span-4 gap-4">
					<div class="text-lg font-semibold col-span-4">Notification Dispatch Process:</div>

					{#each leadDetails.notificationProcesses as { processName, createdAt, status, notificationAttempts, escalations }}
						<details class="collapse collapse-arrow border shadow-sm col-span-4">
							<summary class="collapse-title p-3 pl-4 pr-10 bg-base-200 rounded-box text-sm">
								<div class="flex justify-between items-center">
									<div>
										<div class="font-semibold">{processName}</div>
										<div>{createdAt.toLocaleString()}</div>
									</div>
									{#if status === 'SCHEDULED'}
										<div class="badge badge-info">Scheduled</div>
									{:else if status === 'ACTIVE'}
										<div class="badge badge-warning">In Progress</div>
									{:else if status === 'COMPLETED'}
										<div class="badge badge-success">Completed</div>
									{:else if status === 'CANCELLED'}
										<div class="badge badge-error">Cancelled</div>
									{/if}
								</div>
							</summary>
							<div class="collapse-content">
								<div class="overflow-x-auto col-span-4 mt-4">
									<div class="text-lg font-semibold mb-1">Notification Attempts:</div>
									<div class="table table-zebra border rounded-none">
										<thead class="bg-base-200">
											<tr>
												<th>#</th>
												<th>Date Time</th>
												<th>Operator / Supervisor</th>
												<th>Message</th>
											</tr>
										</thead>
										<tbody>
											{#each notificationAttempts as { createdAt, userValues, message }, i}
												<tr>
													<td>{i + 1}</td>
													<td>{createdAt.toLocaleString()}</td>
													<td>{userValues?.VonageAgentId} - {userValues?.FirstName} {userValues?.LastName}</td>
													<td>{message}</td>
												</tr>
											{:else}
												<tr>
													<td class="text-center" colspan={4}>No Notification Attempts Found</td>
												</tr>
											{/each}
										</tbody>
									</div>
								</div>
								<div class="overflow-x-auto col-span-4 mt-4">
									<div class="text-lg font-semibold mb-1">Escalations:</div>
									<div class="table table-zebra border rounded-none">
										<thead class="bg-base-200">
											<tr>
												<th>#</th>
												<th>Date Time</th>
												<th>Operator / Supervisor</th>
												<th>Message</th>
											</tr>
										</thead>
										<tbody>
											{#each escalations as { createdAt, userValues, message }, i}
												<tr>
													<td>{i + 1}</td>
													<td>{createdAt.toLocaleString()}</td>
													<td>{userValues?.VonageAgentId} - {userValues?.FirstName} {userValues?.LastName}</td>
													<td>{message}</td>
												</tr>
											{:else}
												<tr>
													<td class="text-center" colspan={4}>No Notification Attempts Found</td>
												</tr>
											{/each}
										</tbody>
									</div>
								</div>
							</div>
						</details>
					{/each}

					<div class="divider m-0 col-span-4" />

					<div class="overflow-x-auto col-span-4">
						<div class="text-lg font-semibold mb-1">Responses:</div>
						<div class="table table-zebra border rounded-none">
							<thead class="bg-base-200">
								<tr>
									<th class="flex items-center" colspan="4">
										<div class="w-12">#</div>
										<div class="w-full px-3">Date Time</div>
										<div class="w-full px-3">Response Type</div>
										<div class="w-full px-3">Response Value</div>
										<div class="w-full px-3"></div>
									</th>
								</tr>
							</thead>
							<tbody>
								{#each leadDetails.responses as { createdAt, type, responseValue, isCompleted, actions }, i}
									{@const { actionsList } = actions ? getActionsList(actions) : { actionsList: [] }}
									<tr>
										<td class="px-4" colspan="4">
											<details class="collapse">
												<summary>
													<div class="flex items-center cursor-pointer">
														<div class="w-12">{i + 1}</div>
														<td class="w-full">{createdAt.toLocaleString()}</td>
														<td class="w-full">{type.charAt(0).toUpperCase()}{type.slice(1)}</td>
														<td class="w-full">{responseValue}</td>
														<td class="w-full">
															{#if $page.url.searchParams.get('type') === 'completed' || isCompleted}
																<div class="badge badge-success">Completed</div>
															{:else}
																<div class="badge badge-warning">In Progress</div>
															{/if}
														</td>
													</div>
												</summary>
												<div class="collapse-content flex justify-center">
													<ul class="steps">
														{#each actionsList as { requeueLead, sendSMS, completeLead }}
															<li class="step step-accent">
																{requeueLead
																	? 'Requeue Lead'
																	: sendSMS
																		? 'Send SMS'
																		: completeLead
																			? 'Complete Lead'
																			: ''}
															</li>
														{/each}
													</ul>
												</div>
											</details>
										</td>
									</tr>
								{:else}
									<tr>
										<td class="text-center">No Responses Found</td>
									</tr>
								{/each}
							</tbody>
						</div>
					</div>

					<div class="divider m-0 col-span-4" />

					<div class="overflow-x-auto col-span-2">
						<div class="text-lg font-semibold mb-1">Calls Made to Customer:</div>
						<div class="table table-zebra border rounded-none">
							<thead class="bg-base-200">
								<tr>
									<th>#</th>
									<th>Date Time</th>
									<th>Operator / Supervisor</th>
								</tr>
							</thead>
							<tbody>
								{#each leadDetails.calls as { createdAt, userValues }, i}
									<tr>
										<td>{i + 1}</td>
										<td>{createdAt.toLocaleString()}</td>
										<td>{userValues?.VonageAgentId} - {userValues?.FirstName} {userValues?.LastName}</td>
									</tr>
								{:else}
									<tr>
										<td class="text-center" colspan={3}>No Calls Found</td>
									</tr>
								{/each}
							</tbody>
						</div>
					</div>

					<div class="overflow-x-auto col-span-2">
						<div class="text-lg font-semibold mb-1">SMS Sent to Customer:</div>
						<div class="table table-zebra border rounded-none">
							<thead class="bg-base-200">
								<tr>
									<th>#</th>
									<th>Date Time</th>
									<th>SMS</th>
								</tr>
							</thead>
							<tbody>
								{#each leadDetails.messages as { createdAt, message }, i}
									<tr>
										<td>{i + 1}</td>
										<td>{createdAt.toLocaleString()}</td>
										<td>{message}</td>
									</tr>
								{:else}
									<tr>
										<td class="text-center" colspan={3}>No Messages Found</td>
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
