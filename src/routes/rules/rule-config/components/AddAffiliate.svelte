<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import Modal from '../../../components/Modal.svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	afterUpdate(() => {
		new DataTable('#affiliatesTable');
	});

	export let showModal: boolean;
	$: ({ rule, affiliates } = $ruleConfig);

	let selectedAffiliates: string[] = [];
	$: addedAffiliates = rule.affiliates.map(({ CompanyKey }) => CompanyKey);

	const selectAffiliate = (id: string) => {
		if (addedAffiliates.includes(id)) return;
		if (selectedAffiliates.includes(id)) selectedAffiliates = selectedAffiliates.filter((o) => o !== id);
		else selectedAffiliates = [...selectedAffiliates, id];
	};

	const addAffiliate = () => {
		$ruleConfig.rule.affiliates = [
			...$ruleConfig.rule.affiliates,
			...selectedAffiliates.map((CompanyKey) => ({ CompanyKey }))
		];
		showModal = false;
		selectedAffiliates = [];
	};

	const closeModal = () => {
		showModal = false;
		selectedAffiliates = [];
	};
</script>

<Modal bind:showModal title="Add Campaign Affiliate" boxClasses="max-w-6xl" {closeModal}>
	<div class="overflow-x-auto">
		<table id="affiliatesTable" class="table table-zebra border">
			<thead class="bg-base-200">
				<tr>
					<th></th>
					<th>ID</th>
					<th>Name</th>
				</tr>
			</thead>
			<tbody>
				{#each affiliates as { CompanyKey, CompanyName }}
					<tr
						class="hover {!addedAffiliates.includes(CompanyKey) && 'cursor-pointer'}"
						on:click={() => selectAffiliate(CompanyKey)}
					>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedAffiliates.includes(CompanyKey)}
								disabled={addedAffiliates.includes(CompanyKey)}
							/>
						</td>
						<td>{CompanyKey}</td>
						<td>{CompanyName}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex justify-end mt-4">
		<button class="btn btn-success" on:click={addAffiliate}>
			Add {selectedAffiliates.length} Affiliates
		</button>
	</div>
</Modal>
