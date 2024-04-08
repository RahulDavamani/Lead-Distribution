<script lang="ts">
	import Modal from '../../components/Modal.svelte';
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import Loader from '../../components/Loader.svelte';
	import FormControl from '../../components/FormControl.svelte';
	import { ui } from '../../../stores/ui.store';
	import { lead } from '../../../stores/lead.store';

	type RuleCompany = inferProcedureOutput<AppRouter['lead']['getRuleCompanies']>[number];

	$: selectedLead = $lead.queuedLeads.find((l) => l.id === $lead.switchCompanyModalId);
	let ruleCompanies: RuleCompany[] | undefined;
	let selectedCompanyKey: string | null = null;

	const closeModal = () => ($lead.switchCompanyModalId = undefined);

	const fetchRuleCompanies = async (id: string) => {
		ruleCompanies = await trpc($page).lead.getRuleCompanies.query({ ruleId: id });
		selectedCompanyKey =
			ruleCompanies.find(({ CompanyKey }) => CompanyKey === selectedLead?.CompanyKey)?.CompanyKey ?? null;
	};

	const saveCompany = async () => {
		if (!selectedLead) return;
		ui.setLoader({ title: 'Saving' });
		await trpc($page).lead.updateCompany.query({ id: selectedLead.id, CompanyKey: selectedCompanyKey });
		ui.showToast({ title: 'Company Saved Successfully', class: 'alert-success' });
		ui.setLoader();
		closeModal();
	};

	$: selectedLead?.ruleId ? fetchRuleCompanies(selectedLead.ruleId) : (ruleCompanies = undefined);
</script>

<Modal classes="z-20" title="Switch Company" showModal={selectedLead !== undefined} {closeModal}>
	{#if !ruleCompanies}
		<div class="my-10">
			<Loader title="Fetching Companies" size={80} overlay={false} center={false} />
		</div>
	{:else}
		<FormControl label="Company">
			<select class="select select-bordered" bind:value={selectedCompanyKey}>
				<option value={null}>All</option>
				{#each ruleCompanies as { CompanyKey, CompanyName }}
					<option value={CompanyKey}>{CompanyName}</option>
				{/each}
			</select>
		</FormControl>

		<button class="btn btn-success mt-6 w-full" on:click={saveCompany}>Save</button>
	{/if}
</Modal>
