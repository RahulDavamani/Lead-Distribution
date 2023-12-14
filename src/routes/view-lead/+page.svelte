<script lang="ts">
	import { page } from '$app/stores';
	import { ui } from '../../stores/ui.store';
	import { trpc } from '../../trpc/client';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ lead, prospect, UserId } = data);

	const acceptClick = async () => {
		ui.setLoader({ title: 'Calling Customer' });
		await trpc($page).lead.complete.query({ ProspectKey: prospect.ProspectKey, UserId: Number(UserId) });
		ui.showToast({ title: 'Lead Completed', class: 'alert-success' });
		ui.setLoader();
	};
</script>

<div class="h-screen flex justify-center items-center">
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
				<div>{prospect.CustomerFirstName}</div>
			</div>
			<div class="w-1/2">
				<div class="font-semibold">Last Name</div>
				<div>{prospect.CustomerFirstName}</div>
			</div>
			<div class="w-1/2">
				<div class="font-semibold">Email</div>
				<div>{prospect.Email}</div>
			</div>
			<div class="w-1/2">
				<div class="font-semibold">Phone</div>
				<div>{prospect.Phone}</div>
			</div>
			<div class="w-1/2">
				<div class="font-semibold">Address</div>
				<div>{prospect.Address}</div>
			</div>
			<div class="w-1/2">
				<div class="font-semibold">Zip Code</div>
				<div>{prospect.ZipCode}</div>
			</div>
		</div>

		<button class="btn btn-success w-full mt-8" on:click={acceptClick}>Call Customer</button>
	</div>
</div>
