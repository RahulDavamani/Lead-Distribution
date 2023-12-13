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

	let selectedOperators: number[] = [];
	$: addedOperators = rule.operators.map(({ operatorId }) => operatorId);

	const selectOperator = (id: number) => {
		if (addedOperators.includes(id)) return;
		if (selectedOperators.includes(id)) selectedOperators = selectedOperators.filter((o) => o !== id);
		else selectedOperators = [...selectedOperators, id];
	};

	const addOperator = () => {
		$ruleConfig.rule.operators = [
			...$ruleConfig.rule.operators,
			...selectedOperators.map((operatorId) => ({ operatorId }))
		];
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
				{#each operators as { UserId, Name }}
					<tr
						class="hover {!addedOperators.includes(UserId) && 'cursor-pointer'}"
						on:click={() => selectOperator(UserId)}
					>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedOperators.includes(UserId)}
								disabled={addedOperators.includes(UserId)}
							/>
						</td>
						<td>{UserId}</td>
						<td>{Name}</td>
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
