<script lang="ts">
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { ui } from '../../../stores/ui.store';
	import { lead } from '../../../stores/lead.store';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import Quill from 'quill';
	import 'quill/dist/quill.snow.css';
	import { onMount } from 'svelte';
	import Loader from '../../components/ui/Loader.svelte';
	import Modal from '../../components/ui/Modal.svelte';

	let init = false;
	$: id = $ui.modals.notesModalId;
	$: selectedLead = $lead.queuedLeads?.find((l) => l.id === id);

	let quill: Quill;

	const fetchNotes = async () => {
		if (!id) return;
		const { notes } = await trpc($page).lead.getNotes.query({ id }).catch(trpcClientErrorHandler);
		quill.root.innerHTML = notes;
	};

	onMount(async () => {
		quill = new Quill('#editor', {
			modules: { toolbar: true },
			placeholder: 'Compose...',
			theme: 'snow'
		});
		fetchNotes();
		init = true;
	});

	const saveNotes = ui.loaderWrapper({ title: 'Saving Notes' }, async () => {
		if (!id) return;
		await trpc($page).lead.updateNotes.query({ id, notes: quill.root.innerHTML }).catch(trpcClientErrorHandler);
		ui.setToast({ title: 'Notes Saved Successfully', alertClasses: 'alert-success' });
	});
</script>

<Modal classes="z-20 modal-bottom" title="Lead ({selectedLead?.prospect.ProspectId})">
	{#if !init}
		<div class="my-10">
			<Loader title="Fetching Notes" size={80} overlay={false} fixed={false} />
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
