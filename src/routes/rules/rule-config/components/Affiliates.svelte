<script lang="ts">
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	$: ({ rule, affiliates } = $ruleConfig);
</script>

<div class="flex-grow card border p-4">
	<div class="text-lg font-semibold mb-2">Affiliate:</div>
	<div class="px-2">
		{#each rule.affiliates as { id }}
			{@const affiliate = affiliates.find((o) => o.id === id)}
			<div>{affiliate?.name ?? 'Invalid Affiliate'}</div>
		{:else}
			<div class="text-center absolute inset-0 top-1/2">No Affiliates</div>
		{/each}
	</div>
</div>
