<script lang="ts">
	import { ui } from '../../../stores/ui.store';
	import FormControl from '../../components/FormControl.svelte';

	let prospect = {
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
			!agreeToTerms
		)
			return false;
		return true;
	})();
	const submit = async () => {
		ui.setLoader({ title: 'Creating Lead Prospect' });
		const url = 'https://openapi.xyzies.com/LeadProspect/PostLead';
		const response = await fetch(url, {
			method: 'POST',
			mode: 'no-cors',
			headers: {
				'Content-Type': 'application/json',
				AccessKey: '9A40BA85-78C1-4327-9021-A1AFC06CE9B9'
			},
			body: JSON.stringify(prospect)
		});

		if (response.status === 200) {
			ui.showToast({ class: 'alert-success', title: 'Lead Prospect Created' });
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
		} else ui.showToast({ class: 'alert-error', title: 'Failed to Create Lead Prospect' });
		ui.setLoader();

		const data = await response.json();
		console.log(data);
	};
</script>

<div class="flex h-screen justify-center items-center">
	<div class="card border max-w-5xl w-full p-4 px-6">
		<div class="text-3xl font-bold">Create Lead Prospect</div>
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

			<div class="flex items-end">
				<FormControl classes="mt-4" inputType="In" label="I Agree to the Terms & Conditions">
					<input type="checkbox" class="checkbox" bind:checked={agreeToTerms} />
				</FormControl>
			</div>
			<FormControl label="Lead ID">
				<input type="text" bind:value={prospect.LeadID} class="input input-bordered w-full" />
			</FormControl>
		</div>

		<button class="btn btn-primary {!enableSubmit && 'btn-disabled'} w-full mt-6" on:click={submit}>Submit</button>
	</div>
</div>
