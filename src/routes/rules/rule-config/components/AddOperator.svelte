<script lang="ts">
	import { afterUpdate } from 'svelte';
	import Modal from '../../../components/Modal.svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	afterUpdate(() => new DataTable('#operatorsTable'));

	export let showModal: boolean;
	$: ({
		rule: { operators },
		operators: allOperators
	} = $ruleConfig);

	let selectedOperators: string[] = [];
	$: addedOperators = operators.map(({ UserKey }) => UserKey);

	const selectOperator = (UserKey: string) => {
		if (addedOperators.includes(UserKey)) return;
		if (selectedOperators.includes(UserKey)) selectedOperators = selectedOperators.filter((o) => o !== UserKey);
		else selectedOperators = [...selectedOperators, UserKey];
	};

	const addOperator = () => {
		$ruleConfig.rule.operators = [
			...operators,
			...selectedOperators.map((UserKey, i) => ({ num: operators.length + i + 1, UserKey }))
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
		<table id="operatorsTable" class="table table-zebra border rounded-t-none">
			<thead class="bg-base-300">
				<tr>
					<th></th>
					<th>ID</th>
					<th>Name</th>
					<th>Email</th>
				</tr>
			</thead>
			<tbody>
				{#each allOperators as { UserKey, VonageAgentId, FirstName, LastName, Email }}
					<tr
						class="hover {!addedOperators.includes(UserKey) && 'cursor-pointer'}"
						on:click={() => selectOperator(UserKey)}
					>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedOperators.includes(UserKey)}
								disabled={addedOperators.includes(UserKey)}
							/>
						</td>
						<td>{VonageAgentId}</td>
						<td>{FirstName} {LastName}</td>
						<td>{Email}</td>
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
