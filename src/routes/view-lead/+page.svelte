<script lang="ts">
	import { page } from '$app/stores';
	import type { inferProcedureOutput } from '@trpc/server';
	import { auth } from '../../stores/auth.store';
	import { ui } from '../../stores/ui.store';
	import { trpc } from '../../trpc/client';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import type { AppRouter } from '../../trpc/routers/app.router';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import FormControl from '../components/FormControl.svelte';
	import { completeLeadStatuses } from '$lib/config/completeLead/completeLeadStatuses';

	type Lead = inferProcedureOutput<AppRouter['lead']['view']>['lead'];
	type Prospect = inferProcedureOutput<AppRouter['lead']['view']>['prospect'];

	let lead: Lead | undefined;
	let prospect: Prospect | undefined;
	let UserKey: string | undefined;
	let success = true;
	let completeStatus = 'Sale Made';

	const fetchLead = async () => {
		ui.setLoader({ title: 'Fetching Lead' });

		let ProspectKey = $page.url.searchParams.get('ProspectKey') ?? '';
		if (!ProspectKey)
			return ($ui.alertModal = {
				title: 'Error',
				body: 'Bad Request: Missing params "ProspectKey"',
				actions: [
					{
						name: 'Retry',
						class: 'btn-primary',
						onClick: () => {
							fetchLead();
						}
					}
				]
			});

		const {
			user: { UserKey },
			roleType
		} = $auth;
		const data = await trpc($page).lead.view.query({ ProspectKey, UserKey, roleType }).catch(trpcClientErrorHandler);
		lead = {
			...data.lead,
			createdAt: new Date(data.lead.createdAt),
			updatedAt: new Date(data.lead.updatedAt)
		};
		prospect = {
			...data.prospect,
			CreatedOn: data.prospect.CreatedOn ? new Date(data.prospect.CreatedOn) : null,
			LeadCreatedOn: data.prospect.LeadCreatedOn ? new Date(data.prospect.LeadCreatedOn) : null,
			ValidFrom: new Date(data.prospect.ValidFrom),
			ValidTo: new Date(data.prospect.ValidTo),
			CRMContactCreatedOn: data.prospect.CRMContactCreatedOn ? new Date(data.prospect.CRMContactCreatedOn) : null,
			FirstResponseAt: data.prospect.FirstResponseAt ? new Date(data.prospect.FirstResponseAt) : null
		};
		ui.setLoader();
	};

	onMount(async () => {
		await fetchLead();
	});

	const callLead = async () => {
		if (lead && prospect) {
			ui.setLoader({ title: 'Calling Customer' });
			await trpc($page)
				.lead.callCustomer.query({
					ProspectKey: prospect.ProspectKey,
					UserKey: UserKey ?? $auth.user?.UserKey ?? ''
				})
				.catch(trpcClientErrorHandler);
			ui.showToast({ title: 'Lead Completed Successfully', class: 'alert-success' });
			ui.setLoader();
			window.location.href = `https://bundle.xyzies.com/Web/OrderRedirect?OrderType=1&lpk=${prospect.ProspectKey}`;
		}
	};

	const completeLead = async () => {
		if (lead && prospect && completeStatus) {
			ui.setLoader({ title: 'Completing Lead' });
			await trpc($page)
				.lead.complete.query({
					ProspectKey: prospect.ProspectKey,
					UserKey: UserKey ?? $auth.user?.UserKey ?? '',
					success,
					completeStatus
				})
				.catch(trpcClientErrorHandler);
			ui.showToast({ title: 'Lead completed Successfully', class: 'alert-success' });
			ui.setLoader();
			ui.navigate('/leads');
		}
	};
</script>

{#if lead && prospect}
	<div class="flex justify-center items-center mt-20">
		<div class="card border p-5 max-w-xl w-full">
			<div class="flex justify-between items-center">
				<div class="card-title">
					Lead Received <span class="font-normal font-mono">({prospect.ProspectId})</span>
				</div>
				<div class="flex gap-2">
					<div class="font-semibold">Created on:</div>
					<div>{lead.createdAt.toLocaleString()}</div>
				</div>
			</div>
			<div class="divider mt-1 mb-2" />

			<div class="mb-2 font-bold text-lg pl-2">Customer Details:</div>
			<div class="flex flex-wrap gap-y-2 pl-2">
				<div class="w-1/2">
					<div class="font-semibold">First Name</div>
					<div>{prospect.CustomerFirstName ?? 'N/A'}</div>
				</div>
				<div class="w-1/2">
					<div class="font-semibold">Last Name</div>
					<div>{prospect.CustomerFirstName ?? 'N/A'}</div>
				</div>
				<div class="w-1/2">
					<div class="font-semibold">Email</div>
					<div>{prospect.Email ?? 'N/A'}</div>
				</div>
				<div class="w-1/2">
					<div class="font-semibold">Phone</div>
					<div>{prospect.Phone ?? 'N/A'}</div>
				</div>
				<div class="w-1/2">
					<div class="font-semibold">Address</div>
					<div>{prospect.Address ?? 'N/A'}</div>
				</div>
				<div class="w-1/2">
					<div class="font-semibold">Zip Code</div>
					<div>{prospect.ZipCode ?? 'N/A'}</div>
				</div>
			</div>

			<button class="btn btn-success w-full mt-8" on:click={callLead}>
				<Icon icon="mdi:phone" width={20} />
				Call Customer
			</button>

			{#if $auth.roleType !== 'AGENT'}
				<div class="divider" />
				<!-- <div class="flex gap-6">
					<select class="select select-bordered w-full" bind:value={completeStatus}>
						<option disabled selected value={undefined}>Select Status</option>
						<option value="Junk/Test Contact">Junk/Test Contact</option>
					</select>
				</div> -->

				<div class="flex items-end gap-6">
					<div class="form-control">
						<label class="label cursor-pointer gap-3">
							<span class="font-semibold text-sm">Success</span>
							<input type="checkbox" class="toggle toggle-success toggle-sm" bind:checked={success} />
						</label>
					</div>

					<FormControl classes="w-full">
						<select placeholder="Type here" class="select select-bordered" bind:value={completeStatus}>
							{#each completeLeadStatuses as cs}
								<option value={cs}>{cs}</option>
							{/each}
						</select>
					</FormControl>
					<button
						class="btn {success ? 'btn-success' : 'btn-error'} {!completeStatus && 'btn-disabled'}"
						on:click={completeLead}
					>
						Complete Lead
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
