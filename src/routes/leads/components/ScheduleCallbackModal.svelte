<script lang="ts">
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import FormControl from '../../components/FormControl.svelte';
	import { ui } from '../../../stores/ui.store';
	import { lead } from '../../../stores/lead.store';
	import Modal from '../../components/ui/Modal.svelte';
	import Flatpickr from 'svelte-flatpickr';

	$: id = $ui.modals.scheduleCallbackModalId;
	$: selectedLead = $lead.queuedLeads?.find((l) => l.id === id);

	let scheduledTime = new Date(new Date().getTime() + 1000 * 60);

	const scheduleCallback = ui.loaderWrapper({ title: 'Scheduling Callback' }, async () => {
		if (!selectedLead) return;
		await trpc($page).lead.scheduleCallback.query({
			ProspectKey: selectedLead.ProspectKey,
			scheduledTime
		});
		ui.setToast({ title: `Callback Schedule at ${scheduledTime.toLocaleString()}`, alertClasses: 'alert-success' });
		ui.setModals({});

		ui.setLoader({ title: 'Updating Leads' });
		await lead.fetchQueuedLeads();
	});
</script>

<Modal classes="z-20" title="Schedule Callback ({selectedLead?.prospect.ProspectId})">
	<FormControl label="Schedule Time">
		<Flatpickr
			placeholder="Choose Date"
			class="input input-bordered cursor-pointer"
			bind:value={scheduledTime}
			options={{
				enableTime: true,
				altInput: true,
				minDate: new Date(),
				allowInput: true
			}}
		/>
	</FormControl>

	<button
		class="btn btn-success mt-6 w-full {scheduledTime < $lead.today && 'btn-disabled'}"
		on:click={scheduleCallback}
	>
		Schedule Callback
	</button>
</Modal>
