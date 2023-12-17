<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddOperator from './AddOperator.svelte';

	$: ({ rule, operators } = $ruleConfig);
	let showModal = false;

	const deleteOperator = (id: number) => ($ruleConfig.rule.operators = rule.operators.filter((o) => o.UserId !== id));
</script>

<div class="w-full card border p-4">
	<div class="flex items-center gap-2 mb-4">
		<div class="text-lg font-semibold">Campaign Operators:</div>
		<button class="z-10 text-success" on:click={() => (showModal = true)}>
			<Icon icon="mdi:add-circle" width={24} />
		</button>
	</div>
	<div class="px-2 space-y-2">
		{#each rule.operators as { UserId }}
			{@const operator = operators.find((o) => o.UserId === UserId)}

			<div class="border shadow rounded-lg px-2 py-1 flex justify-between items-center">
				<div>
					{#if operator}
						<span class="font-mono">{UserId}:</span>
						<span class="font-semibold">{operator.Name}</span>
						<span class="italic"> - {operator.Email}</span>
					{:else}
						<span>Invalid Operator</span>
					{/if}
				</div>
				<button class="text-error" on:click={() => deleteOperator(UserId)}>
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
