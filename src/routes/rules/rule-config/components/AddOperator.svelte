<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import Modal from '../../../components/Modal.svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	afterUpdate(() => {
		new DataTable('#operatorsTable');
	});

	export let showModal: boolean;
	$: ({ rule, operators } = $ruleConfig);

	let selectedOperators: string[] = [];
	$: addedOperators = rule.operators.map(({ id }) => id);

	const selectOperator = (id: string) => {
		if (addedOperators.includes(id)) return;
		if (selectedOperators.includes(id)) selectedOperators = selectedOperators.filter((o) => o !== id);
		else selectedOperators = [...selectedOperators, id];
	};

	const addOperator = () => {
		$ruleConfig.rule.operators = [...$ruleConfig.rule.operators, ...selectedOperators.map((id) => ({ id }))];
		showModal = false;
		selectedOperators = [];
	};

	const closeModal = () => {
		showModal = false;
		selectedOperators = [];
	};
</script>

<Modal bind:showModal title="Add Campaign Operator" boxClasses="max-w-6xl" {closeModal}>
	<div class="overflow-x-auto">
		<table id="operatorsTable" class="table table-zebra border">
			<thead>
				<tr>
					<th></th>
					<th>ID</th>
					<th>Name</th>
				</tr>
			</thead>
			<tbody>
				{#each operators as { id, name }}
					<tr class="hover {!addedOperators.includes(id) && 'cursor-pointer'}" on:click={() => selectOperator(id)}>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedOperators.includes(id)}
								disabled={addedOperators.includes(id)}
							/>
						</td>
						<td>{id}</td>
						<td>{name}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex justify-end mt-4">
		<button class="btn btn-success" on:click={addOperator}>
			Add {selectedOperators.length} Operators
		</button>
	</div>
</Modal>
