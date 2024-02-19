<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ui } from '../../../stores/ui.store';
	import { trpc } from '../../../trpc/client';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import type { ProspectInput } from '../../../zod/prospectInput.schema';
	import FormControl from '../../components/FormControl.svelte';

	export let data;
	$: ({ affiliates } = data);
	onMount(() => (AccessKey = affiliates[0].Value));

	let AccessKey = '';
	let prospect: ProspectInput = {
		LeadID: '',
		CustomerInfo: {
			FirstName: '',
			LastName: '',
			Email: '',
			Phone: '',
			Address: '',
			ZipCode: ''
		},
		TrustedFormCertUrl: 'TrustedFormCertUrl.com',
		ConsentToContact: '',
		AcceptedTerms: ''
	};
	let agreeToTerms = false;
	$: prospect.ConsentToContact = agreeToTerms ? 'true' : 'false';
	$: prospect.AcceptedTerms = agreeToTerms ? 'true' : 'false';

	$: enableSubmit = (() => {
		const { FirstName, LastName, Email, Phone, Address, ZipCode } = prospect.CustomerInfo;
		if (
			!FirstName.length ||
			!LastName.length ||
			!Email.length ||
			!Phone.length ||
			!Address.length ||
			!ZipCode.length ||
			!prospect.LeadID.length ||
			!agreeToTerms
		)
			return false;
		return true;
	})();

	const submit = async () => {
		ui.setLoader({ title: 'Creating Lead Prospect' });
		await trpc($page).lead.postLeadProspect.query({ prospect, AccessKey }).catch(trpcClientErrorHandler);
		ui.showToast({ class: 'alert-success', title: 'Lead Prospect Created' });
		ui.setLoader();
		prospect = {
			LeadID: '',
			CustomerInfo: {
				FirstName: '',
				LastName: '',
				Email: '',
				Phone: '',
				Address: '',
				ZipCode: ''
			},
			TrustedFormCertUrl: 'TrustedFormCertUrl.com',
			ConsentToContact: '',
			AcceptedTerms: ''
		};
	};

	const submitDummy = async () => {
		for (let i = 0; i < Array.from(Array(5).keys()).length; i++) {
			let prospect: ProspectInput = {
				LeadID: '123',
				CustomerInfo: {
					FirstName: 'Rahul',
					LastName: `Test ${i + 1}`,
					Email: `b${i + 1}@gmail.com`,
					Phone: '+919176004141',
					Address: 'abc',
					ZipCode: '123'
				},
				TrustedFormCertUrl: 'TrustedFormCertUrl.com',
				ConsentToContact: '',
				AcceptedTerms: ''
			};
			await trpc($page).lead.postLeadProspect.query({ prospect, AccessKey }).catch(trpcClientErrorHandler);
		}
	};
</script>

<div class="flex h-screen justify-center items-center">
	<div class="card border max-w-5xl w-full p-4 px-6">
		<div class="flex justify-between items-end">
			<div class="text-3xl font-bold w-full">Submit Prospect (Testing)</div>
			<select bind:value={AccessKey} class="select select-bordered select-sm w-full text-center">
				{#each affiliates as { Text, Value }}
					<option value={Value}>{Text.replace(/([A-Z])/g, ' $1').trim()}</option>
				{/each}
			</select>
		</div>
		<div class="divider mt-2" />

		<div class="grid grid-cols-2 gap-x-6">
			<FormControl label="First Name">
				<input type="text" bind:value={prospect.CustomerInfo.FirstName} class="input input-bordered w-full" />
			</FormControl>
			<FormControl label="Last Name">
				<input type="text" bind:value={prospect.CustomerInfo.LastName} class="input input-bordered w-full" />
			</FormControl>

			<FormControl label="Email">
				<input type="text" bind:value={prospect.CustomerInfo.Email} class="input input-bordered w-full" />
			</FormControl>
			<FormControl label="Phone">
				<input type="text" bind:value={prospect.CustomerInfo.Phone} class="input input-bordered w-full" />
			</FormControl>

			<FormControl label="Address">
				<input type="text" bind:value={prospect.CustomerInfo.Address} class="input input-bordered w-full" />
			</FormControl>
			<FormControl label="Zip Code">
				<input type="text" bind:value={prospect.CustomerInfo.ZipCode} class="input input-bordered w-full" />
			</FormControl>

			<FormControl label="Trusted Form Certificate URL">
				<input
					type="text"
					bind:value={prospect.TrustedFormCertUrl}
					class="input input-bordered w-full cursor-pointer"
					readonly
				/>
			</FormControl>
			<FormControl label="Lead ID">
				<input type="text" bind:value={prospect.LeadID} class="input input-bordered w-full" />
			</FormControl>
		</div>
		<div class="flex items-end">
			<FormControl classes="mt-4" inputType="In" label="I Agree to the Terms & Conditions">
				<input type="checkbox" class="checkbox" bind:checked={agreeToTerms} />
			</FormControl>
		</div>

		<button class="btn btn-primary {!enableSubmit && 'btn-disabled'} w-full mt-6" on:click={submit}>Submit</button>
		<button class="btn btn-primary w-full mt-6 hidden" on:click={submitDummy}>Submit Dummy</button>
	</div>
</div>
