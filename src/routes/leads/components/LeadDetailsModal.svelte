<script lang="ts">
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { getActionsList } from '$lib/config/actions/utils/getActionsList';
	import { getTimeElapsed, getTimeElapsedText } from '$lib/client/DateTime';
	import Loader from '../../components/ui/Loader.svelte';
	import Modal from '../../components/ui/Modal.svelte';
	import { onMount } from 'svelte';
	import { ui } from '../../../stores/ui.store';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import { lead } from '../../../stores/lead.store';

	type LeadDetails = inferProcedureOutput<AppRouter['lead']['getLeadDetails']>;

	$: ({ timezone } = $lead);

	let leadDetails: LeadDetails | undefined;
	$: id = $ui.modals.leadDetailsModelId;

	const fetchLeadDetails = async () => {
		if (!id) return;
		const { tab } = $lead;
		leadDetails = await trpc($page).lead.getLeadDetails.query({ id, type: tab }).catch(trpcClientErrorHandler);
	};
	onMount(fetchLeadDetails);
</script>

<Modal title="Lead Details {leadDetails?.ProspectId ? `(${leadDetails.ProspectId})` : ''}" boxClasses="max-w-full">
	{#if leadDetails}
		<div class="grid grid-cols-6 gap-4">
			<div class="overflow-x-auto col-span-2 row-span-2">
				<div class="text-lg font-semibold mb-1">Lead Logs History:</div>
				<ul class="steps steps-vertical">
					{#each leadDetails.logs as { createdAt, log }}
						<li class="step step-primary my-2">
							<div class="text-left">
								<div class="font-semibold">{log}</div>
								<div class="text-xs">{createdAt.toLocaleString('en-US', { timeZone: timezone })}</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<div class="grid grid-cols-4 col-span-4 gap-4">
				<div class="text-lg font-semibold col-span-4">Notification Dispatch Process:</div>

				{#each leadDetails.notificationProcesses as { processName, createdAt, completedAt, status, notificationAttempts, escalations }}
					{@const leadResponseTime = getTimeElapsed(createdAt, completedAt ?? $lead.today)}
					<details class="collapse collapse-arrow border shadow-sm col-span-4">
						<summary class="collapse-title p-3 pl-4 pr-10 bg-base-200 rounded-box text-sm">
							<div class="flex justify-between items-center">
								<div>
									<div class="flex items-center gap-4">
										<div class="font-semibold">{processName}</div>
										{#if status === 'SCHEDULED'}
											<div class="badge badge-sm badge-info">Scheduled</div>
										{:else if status === 'ACTIVE'}
											<div class="badge badge-sm badge-warning">In Progress</div>
										{:else if status === 'COMPLETED'}
											<div class="badge badge-sm badge-success">Completed</div>
										{:else if status === 'CANCELLED'}
											<div class="badge badge-sm badge-error">Cancelled</div>
										{/if}
									</div>
									<div>{createdAt.toLocaleString('en-US', { timeZone: timezone })}</div>
								</div>

								<div class="max-w-48 text-right mr-2">
									<div class="font-semibold">Lead Response Time</div>
									<div>
										{getTimeElapsedText(createdAt, leadResponseTime < 0 ? createdAt : completedAt ?? $lead.today)}
									</div>
								</div>
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
												<td>{createdAt.toLocaleString('en-US', { timeZone: timezone })}</td>
												{#if userValues}
													<td>{userValues.VonageAgentId} - {userValues.FirstName} {userValues.LastName}</td>
												{:else}
													<td>N/A</td>
												{/if}
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
												<td>{createdAt.toLocaleString('en-US', { timeZone: timezone })}</td>
												{#if userValues}
													<td>{userValues.VonageAgentId} - {userValues.FirstName} {userValues.LastName}</td>
												{:else}
													<td>N/A</td>
												{/if}
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
									<div class="w-full px-3">Actions Status</div>
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
													<td class="w-full">{createdAt.toLocaleString('en-US', { timeZone: timezone })}</td>
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
													{#each actionsList as { sendSMS, scheduleCallback, completeLead }}
														<li class="step step-accent">
															{sendSMS
																? 'Send SMS'
																: scheduleCallback
																	? 'Schedule Callback'
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
									<td>{createdAt.toLocaleString('en-US', { timeZone: timezone })}</td>
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
								<th>Conversation ID</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each leadDetails.messages as { createdAt, message, messageResponse }, i}
								<tr>
									<td>{i + 1}</td>
									<td>{createdAt.toLocaleString('en-US', { timeZone: timezone })}</td>
									<td>{message}</td>
									<td>{messageResponse?.conversationId ?? 'N/A'}</td>
									<td>{messageResponse?.status ?? 'N/A'}</td>
								</tr>
							{:else}
								<tr>
									<td class="text-center" colspan={5}>No Messages Found</td>
								</tr>
							{/each}
						</tbody>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="my-10">
			<Loader title="Fetching Lead History" size={80} overlay={false} fixed={false} />
		</div>
	{/if}
</Modal>
