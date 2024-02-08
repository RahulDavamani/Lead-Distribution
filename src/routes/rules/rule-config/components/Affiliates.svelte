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

<div class="w-full h-fit card border shadow">
	<details class="collapse collapse-arrow">
		<summary class="collapse-title pr-0">
			<div class="flex gap-2">
				<div>
					<span class="text-lg font-semibold">Affiliates:</span>
					<span class="font-mono">({affiliates.length})</span>
				</div>
				<button class="z-10 text-success" on:click={() => (showModal = true)}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>
		</summary>
		<div class="collapse-content px-4">
			<div class="space-y-2">
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
	</details>
</div>

<AddAffiliate bind:showModal />
