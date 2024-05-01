<script lang="ts">
	import type { inferProcedureOutput } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import FormControl from '../../components/FormControl.svelte';
	import { ui } from '../../../stores/ui.store';
	import { lead } from '../../../stores/lead.store';
	import Modal from '../../components/ui/Modal.svelte';
	import Loader from '../../components/ui/Loader.svelte';
	import { onMount } from 'svelte';

	type RuleCompany = inferProcedureOutput<AppRouter['lead']['getRuleCompanies']>[number];

	$: id = $ui.modals.switchCompanyModalId;
	$: selectedLead = $lead.queuedLeads?.find((l) => l.id === id);

	let ruleCompanies: RuleCompany[] | undefined;
	let selectedCompanyKey: string | null = null;

	const fetchRuleCompanies = async () => {
		if (!id) return;
		ruleCompanies = undefined;
		ruleCompanies = await trpc($page).lead.getRuleCompanies.query({ ruleId: id });
		selectedCompanyKey =
			ruleCompanies.find(({ CompanyKey }) => CompanyKey === selectedLead?.CompanyKey)?.CompanyKey ?? null;
	};
	onMount(fetchRuleCompanies);

	const saveCompany = ui.loaderWrapper({ title: 'Saving Company' }, async () => {
		if (!id) return;
		await trpc($page).lead.updateCompany.query({ id, CompanyKey: selectedCompanyKey });
		ui.setToast({ title: 'Company Saved Successfully', alertClasses: 'alert-success' });
		ui.setModals({});

		ui.setLoader({ title: 'Updating Leads' });
		await lead.fetchQueuedLeads();
	});
</script>

<Modal classes="z-20" title="Switch Company ({selectedLead?.prospect.ProspectId})">
	{#if !ruleCompanies}
		<div class="my-10">
			<Loader title="Fetching Companies" size={80} overlay={false} fixed={false} />
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
