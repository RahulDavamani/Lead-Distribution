<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddOperator from './AddOperator.svelte';
	import { tick } from 'svelte';

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

<div class="w-full card border p-4">
	<div class="flex items-center gap-2 mb-4">
		<div class="text-lg font-semibold">Campaign Operators:</div>
		<button class="z-10 text-success" on:click={() => (showModal = true)}>
			<Icon icon="mdi:add-circle" width={24} />
		</button>
	</div>
	<div class="px-2 space-y-2">
		{#each operators as { UserKey }}
			{@const operator = allOperators.find((o) => o.UserKey === UserKey)}

			<div class="border shadow rounded-lg px-2 py-1 flex justify-between items-center">
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
				<button class="text-error" on:click={() => deleteOperator(UserKey)}>
					<Icon icon="mdi:delete" width={20} />
				</button>
			</div>
		{:else}
			<div class="text-center absolute inset-0 top-1/2">No Operators</div>
			<div class="py-4" />
		{/each}
	</div>
</div>

<AddOperator bind:showModal />
