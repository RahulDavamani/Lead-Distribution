<script lang="ts">
	import { page } from '$app/stores';
	import type { inferProcedureOutput } from '@trpc/server';
	import { auth } from '../../stores/auth.store';
	import { ui } from '../../stores/ui.store';
	import { trpc } from '../../trpc/client';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import type { AppRouter } from '../../trpc/routers/app.router';
	import { onMount } from 'svelte';

	type Lead = inferProcedureOutput<AppRouter['lead']['view']>['lead'];
	type Prospect = inferProcedureOutput<AppRouter['lead']['view']>['prospect'];

	let lead: Lead | undefined;
	let prospect: Prospect | undefined;
	let closeStatus: string | undefined;

	const fetchLead = async () => {
		ui.setLoader({ title: 'Fetching Lead' });
		const keys = $page.url.searchParams.get('keys');
		if (!keys || keys.split(',').length !== 2) {
			ui.setLoader();
			return ($ui.alertModal = {
				title: 'Error',
				body: 'Bad Request: Missing params "keys"',
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
		}
		const ProspectKey = keys.split(',')[0];

		let UserKey: string | undefined;
		if ($auth.user?.UserKey) UserKey = auth.isSupervisor() ? undefined : $auth.user?.UserKey;
		else UserKey = keys.split(',')[1];

		const data = await trpc($page).lead.view.query({ ProspectKey, UserKey }).catch(trpcClientErrorHandler);
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
			const UserKey = $auth.user?.UserKey ?? $page.url.searchParams.get('UserKey') ?? '';
			await trpc($page)
				.lead.complete.query({ ProspectKey: prospect.ProspectKey, UserKey })
				.catch(trpcClientErrorHandler);
			ui.showToast({ title: 'Lead Completed Successfully', class: 'alert-success' });
			ui.setLoader();
			window.location.href = `https://bundle.xyzies.com/Web/OrderRedirect?OrderType=1&lpk=${prospect.ProspectKey}`;
		}
	};

	const closeLead = async () => {
		if (lead && prospect) {
			ui.setLoader({ title: 'Closing Lead' });
			const UserKey = $auth.user?.UserKey ?? $page.url.searchParams.get('UserKey') ?? '';
			await trpc($page).lead.close.query({ ProspectKey: prospect.ProspectKey, UserKey }).catch(trpcClientErrorHandler);
			ui.showToast({ title: 'Lead Closed Successfully', class: 'alert-success' });
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

			<button class="btn btn-success w-full mt-8" on:click={callLead}>Call Customer</button>

			{#if auth.isSupervisor()}
				<div class="divider" />
				<div class="flex gap-6">
					<select class="select select-bordered w-full" bind:value={closeStatus}>
						<option disabled selected value={undefined}>Select Status</option>
						<option value="Junk/Test Contact">Junk/Test Contact</option>
					</select>
					<button class="btn btn-error {!closeStatus && 'btn-disabled'}" on:click={closeLead}>Close Lead</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
