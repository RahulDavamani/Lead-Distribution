<script lang="ts">
	import { afterUpdate } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import type { Rule } from '../../../../zod/rule.schema';
	import { nanoid } from 'nanoid';
	import { ui } from '../../../../stores/ui.store';
	import Modal from '../../../components/ui/Modal.svelte';

	afterUpdate(() => new DataTable('#operatorsTable'));

	$: ({
		rule: { operators },
		masterData
	} = $ruleConfig);

	let selectedOperators: string[] = [];
	$: addedOperators = operators.map(({ UserKey }) => UserKey);

	const selectOperator = (UserKey: string) => {
		if (addedOperators.includes(UserKey)) return;
		if (selectedOperators.includes(UserKey)) selectedOperators = selectedOperators.filter((o) => o !== UserKey);
		else selectedOperators = [...selectedOperators, UserKey];
	};

	const addOperator = () => {
		const newOperators: Rule['operators'] = selectedOperators.map((UserKey, i) => ({
			id: nanoid(),
			num: operators.length + i + 1,
			UserKey,
			assignNewLeads: true,
			assignCallbackLeads: true
		}));
		$ruleConfig.rule.operators = [...operators, ...newOperators];
		selectedOperators = [];
		ui.setModals();
	};
</script>

<Modal title="Add Campaign Operator" boxClasses="max-w-6xl">
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
				{#each masterData.operators as { UserKey, VonageAgentId, FirstName, LastName, Email }}
					{#if UserKey}
						<tr
							class="hover {!addedOperators.includes(UserKey) && 'cursor-pointer'}"
							on:click={() => UserKey && selectOperator(UserKey)}
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
					{/if}
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
