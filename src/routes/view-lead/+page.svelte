<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '../../stores/auth.store';
	import { ui } from '../../stores/ui.store';
	import { trpc } from '../../trpc/client';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ lead, prospect, UserId } = data);

	let closeStatus: string | undefined;

	const callLead = async () => {
		ui.setLoader({ title: 'Calling Customer' });
		await trpc($page)
			.lead.complete.query({ ProspectKey: prospect.ProspectKey, UserId: Number(UserId) })
			.catch(trpcClientErrorHandler);
		ui.showToast({ title: 'Lead Completed Successfully', class: 'alert-success' });
		ui.setLoader();
		window.location.href = `https://bundle.xyzies.com/Web/OrderRedirect?OrderType=1&lpk=${prospect.ProspectKey}`;
	};

	const closeLead = async () => {
		ui.setLoader({ title: 'Closing Lead' });
		await trpc($page)
			.lead.close.query({ ProspectKey: prospect.ProspectKey, UserId: Number(UserId) })
			.catch(trpcClientErrorHandler);
		ui.showToast({ title: 'Lead Closed Successfully', class: 'alert-success' });
		ui.setLoader();
		ui.navigate('/leads');
	};
</script>

<div class="flex justify-center items-center mt-20">
	<div class="card border p-5 max-w-xl w-full">
		<div class="flex justify-between items-center">
			<div class="card-title">Lead Received</div>
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
