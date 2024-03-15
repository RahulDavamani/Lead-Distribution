<script lang="ts">
	import { afterUpdate } from 'svelte';
	import Modal from '../../../components/Modal.svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import { nanoid } from 'nanoid';

	afterUpdate(() => {
		new DataTable('#affiliatesTable');
	});

	export let showModal: boolean;
	$: ({
		rule: { affiliates },
		affiliates: allAffiliates
	} = $ruleConfig);

	let selectedAffiliates: string[] = [];
	$: addedAffiliates = affiliates.map(({ CompanyKey }) => CompanyKey);

	const selectAffiliate = (id: string) => {
		if (addedAffiliates.includes(id)) return;
		if (selectedAffiliates.includes(id)) selectedAffiliates = selectedAffiliates.filter((o) => o !== id);
		else selectedAffiliates = [...selectedAffiliates, id];
	};

	const addAffiliate = () => {
		$ruleConfig.rule.affiliates = [
			...affiliates,
			...selectedAffiliates.map((CompanyKey, i) => ({
				id: nanoid(),
				num: affiliates.length + i + 1,
				CompanyKey
			}))
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
		<table id="affiliatesTable" class="table table-zebra border rounded-t-none">
			<thead class="bg-base-300">
				<tr>
					<th></th>
					<th>Name</th>
					<th>Rule</th>
				</tr>
			</thead>
			<tbody>
				{#each allAffiliates as { CompanyKey, CompanyName, rule }}
					{@const disabled =
						addedAffiliates.includes(CompanyKey) || (rule !== undefined && rule.id !== $ruleConfig.rule.id)}
					{@const ruleName = addedAffiliates.includes(CompanyKey)
						? $ruleConfig.rule.name
						: rule?.id === $ruleConfig.rule.id
							? addedAffiliates.includes(CompanyKey)
								? $ruleConfig.rule.name
								: 'N/A'
							: rule?.name ?? 'N/A'}

					<tr class="hover {!disabled && 'cursor-pointer'}" on:click={() => !disabled && selectAffiliate(CompanyKey)}>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedAffiliates.includes(CompanyKey)}
								{disabled}
							/>
						</td>
						<td>{CompanyName}</td>
						<td>{ruleName}</td>
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
