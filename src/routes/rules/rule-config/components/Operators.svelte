<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddOperator from './AddOperator.svelte';
	import { tick } from 'svelte';
	import FormControl from '../../../components/FormControl.svelte';

	$: ({
		rule: { operators },
		operators: allOperators
	} = $ruleConfig);
	let showModal = false;

	const sortOperators = () =>
		($ruleConfig.rule.operators = operators.sort((a, b) => a.num - b.num).map((op, i) => ({ ...op, num: i })));

	const deleteOperator = async (UserKey: string) => {
		$ruleConfig.rule.operators = operators.filter((op) => op.UserKey !== UserKey);
		await tick();
		sortOperators();
	};
</script>

<div class="w-full h-fit card border shadow">
	<details class="collapse collapse-arrow">
		<summary class="collapse-title pr-0">
			<div class="flex gap-2">
				<div>
					<span class="text-lg font-semibold">Campaign Operators:</span>
					<span class="font-mono">({operators.length})</span>
				</div>
				<button class="z-10 text-success" on:click={() => (showModal = true)}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>
		</summary>
		<div class="collapse-content px-4">
			<div class="space-y-2">
				{#each operators as { UserKey }, i}
					{@const operator = allOperators.find((o) => o.UserKey === UserKey)}

					<div class="border shadow rounded-lg p-3">
						<div class="flex justify-start items-center">
							<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteOperator(UserKey)}>
								<Icon icon="mdi:close" class="text-error" width={20} />
							</button>

							<div>
								{#if operator}
									{@const { VonageAgentId, FirstName, LastName, Email } = operator}
									<span class="font-mono">{VonageAgentId}:</span>
									<span class="font-semibold">{FirstName} {LastName}</span>
									<span class="italic"> - {Email}</span>
								{:else}
									<span>Invalid Operator</span>
								{/if}
							</div>
						</div>

						<div class="grid grid-cols-2">
							<FormControl inputType="In" label="Assign New Leads">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-primary"
									bind:checked={$ruleConfig.rule.operators[i].assignNewLeads}
								/>
							</FormControl>
							<FormControl inputType="In" label="Assign Callback Leads">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-primary"
									bind:checked={$ruleConfig.rule.operators[i].assignCallbackLeads}
								/>
							</FormControl>
						</div>
					</div>
				{:else}
					<div class="text-center absolute inset-0 top-1/2">No Operators</div>
					<div class="py-4" />
				{/each}
			</div>
		</div>
	</details>
</div>

<AddOperator bind:showModal />
