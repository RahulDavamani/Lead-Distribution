<script lang="ts">
	import Modal from '../../components/Modal.svelte';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import Loader from '../../components/Loader.svelte';
	import { ui } from '../../../stores/ui.store';
	import { lead } from '../../../stores/lead.store';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import Quill from 'quill';
	import 'quill/dist/quill.snow.css';
	import { onMount } from 'svelte';

	let init = false;
	$: selectedLead = $lead.queuedLeads.find((l) => l.id === $lead.notesModalId);

	let quill: Quill;

	const closeModal = () => {
		$lead.notesModalId = undefined;
		init = false;
	};

	onMount(async () => {
		if (init) return;
		quill = new Quill('#editor', {
			modules: { toolbar: true },
			placeholder: 'Compose...',
			theme: 'snow'
		});

		if (!$lead.notesModalId) return;
		const { notes } = await trpc($page).lead.getNotes.query({ id: $lead.notesModalId }).catch(trpcClientErrorHandler);
		quill.root.innerHTML = notes;
		init = true;
	});

	const saveNotes = async () => {
		if (!$lead.notesModalId) return;
		ui.setLoader({ title: 'Saving Notes' });
		await trpc($page).lead.updateNotes.query({ id: $lead.notesModalId, notes: quill.root.innerHTML });
		ui.showToast({ title: 'Notes Saved Successfully', class: 'alert-success' });
		ui.setLoader();
		closeModal();
	};
</script>

<Modal
	classes="z-20 modal-bottom"
	title="Lead Details: ({selectedLead?.prospect.ProspectId})"
	showModal={$lead.notesModalId !== undefined}
	{closeModal}
>
	{#if !init}
		<div class="my-10">
			<Loader title="Fetching Notes" size={80} overlay={false} center={false} />
		</div>
	{/if}
	<div class="{!init && 'hidden'} d">
		<div class="text-lg font-semibold mb-2">Notes</div>
		<div class="h-96 mb-16">
			<div id="editor" />
		</div>
		<button class="btn btn-success w-full" on:click={saveNotes}>Save</button>
	</div>
</Modal>
