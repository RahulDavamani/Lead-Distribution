<script lang="ts">
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import FormControl from '../../components/FormControl.svelte';
	import { ui } from '../../../stores/ui.store';
	import { lead } from '../../../stores/lead.store';
	import Modal from '../../components/ui/Modal.svelte';
	import { auth } from '../../../stores/auth.store';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';

	$: id = $ui.modals.updateDispositionModalId;
	$: selectedLead = $lead.queuedLeads?.find((l) => l.id === id);

	let disposition = '';

	const updateDisposition = ui.loaderWrapper({ title: 'Updating Disposition' }, async () => {
		if (!selectedLead) return;
		await trpc($page)
			.lead.validateResponse.query({
				ProspectKey: selectedLead.ProspectKey,
				ResponseType: 'disposition',
				Response: disposition,
				UserKey: $auth.user.UserKey
			})
			.catch(trpcClientErrorHandler);
		ui.setToast({ title: 'Disposition Updated Successfully', alertClasses: 'alert-success' });
		ui.setModals({});

		ui.setLoader({ title: 'Updating Leads' });
		await lead.fetchQueuedLeads();
	});
</script>

<Modal classes="z-20" title="Update Disposition ({selectedLead?.prospect.ProspectId})">
	<FormControl label="Disposition">
		<select class="select select-bordered" bind:value={disposition}>
			<option value="" disabled>Select Disposition</option>
			<option value="No Answer">No Answer</option>
		</select>
	</FormControl>

	<button class="btn btn-success mt-6 w-full {!disposition.length && 'btn-disabled'}" on:click={updateDisposition}>
		Update
	</button>
</Modal>
