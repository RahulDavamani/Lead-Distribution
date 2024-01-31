<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddAffiliate from './AddAffiliate.svelte';

	$: ({
		rule: { affiliates },
		affiliates: allAffiliates
	} = $ruleConfig);
	let showModal = false;

	const sortAffiliates = () =>
		($ruleConfig.rule.affiliates = affiliates.sort((a, b) => a.num - b.num).map((af, i) => ({ ...af, num: i })));

	const deleteAffiliate = (CompanyKey: string) => {
		$ruleConfig.rule.affiliates = affiliates.filter((af) => af.CompanyKey !== CompanyKey);
		sortAffiliates();
	};
</script>

<div class="w-full card border p-4">
	<div class="flex items-center gap-2 mb-4">
		<div class="text-lg font-semibold">Affiliates:</div>
		<button class="z-10 text-success" on:click={() => (showModal = true)}>
			<Icon icon="mdi:add-circle" width={24} />
		</button>
	</div>
	<div class="px-2 space-y-2">
		{#each affiliates as { CompanyKey }}
			{@const affiliateName =
				allAffiliates.find((a) => a.CompanyKey === CompanyKey)?.CompanyName ?? 'Invalid Affiliate'}

			<div class="border shadow rounded-lg px-2 py-1 flex justify-between items-center">
				<div>{affiliateName}</div>
				<button class="text-error" on:click={() => deleteAffiliate(CompanyKey)}>
					<Icon icon="mdi:delete" width={20} />
				</button>
			</div>
		{:else}
			<div class="text-center absolute inset-0 top-1/2">No Affiliates</div>
			<div class="py-4" />
		{/each}
	</div>
</div>

<AddAffiliate bind:showModal />
