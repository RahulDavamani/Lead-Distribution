<script lang="ts">
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	$: ({ rule, operators } = $ruleConfig);
</script>

<div class="flex-grow card border p-4">
	<div class="text-lg font-semibold mb-2">Campaign Operators:</div>
	<div class="px-2">
		{#each rule.operators as { id }}
			{@const operator = operators.find((o) => o.id === id)}
			<div>{operator?.name ?? 'Invalid Operator'}</div>
		{:else}
			<div class="text-center absolute inset-0 top-1/2">No Operators</div>
		{/each}
	</div>
</div>
