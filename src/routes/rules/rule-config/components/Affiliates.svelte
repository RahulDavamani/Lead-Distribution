<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddAffiliate from './AddAffiliate.svelte';
	import { tick } from 'svelte';

	$: ({
		rule: { affiliates },
		affiliates: allAffiliates
	} = $ruleConfig);
	let showModal = false;

	const sortAffiliates = () =>
		($ruleConfig.rule.affiliates = affiliates.sort((a, b) => a.num - b.num).map((af, i) => ({ ...af, num: i })));

	const deleteAffiliate = async (CompanyKey: string) => {
		$ruleConfig.rule.affiliates = affiliates.filter((af) => af.CompanyKey !== CompanyKey);
		await tick();
		sortAffiliates();
	};
</script>

<div class="mt-2">
	<div class="flex gap-2 mb-4">
		<div>
			<span class="text-lg font-bold">Affiliates:</span>
			<span class="font-mono">({affiliates.length})</span>
		</div>
		<button class="z-10 text-success" on:click={() => (showModal = true)}>
			<Icon icon="mdi:add-circle" width={24} />
		</button>
	</div>

	<div class="space-y-3">
		{#each affiliates as { CompanyKey }}
			{@const affiliateName =
				allAffiliates.find((a) => a.CompanyKey === CompanyKey)?.CompanyName ?? 'Invalid Affiliate'}

			<div class="border shadow rounded-lg p-1 flex items-center">
				<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteAffiliate(CompanyKey)}>
					<Icon icon="mdi:close" class="text-error" width={20} />
				</button>
				<div>{affiliateName}</div>
			</div>
		{:else}
			<div class="text-center absolute inset-0 top-1/2">No Affiliates</div>
			<div class="py-4" />
		{/each}
	</div>
</div>

<AddAffiliate bind:showModal />
