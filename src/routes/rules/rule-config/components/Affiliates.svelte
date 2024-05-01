<script lang="ts">
	import { ruleChanges, ruleConfig } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import { ui } from '../../../../stores/ui.store';
	import IconBtn from '../../../components/ui/IconBtn.svelte';

	$: ({
		rule: { affiliates },
		masterData
	} = $ruleConfig);

	const sortAffiliates = () =>
		($ruleConfig.rule.affiliates = affiliates.sort((a, b) => a.num - b.num).map((af, i) => ({ ...af, num: i })));

	const deleteAffiliate = async (CompanyKey: string) => {
		$ruleConfig.rule.affiliates = affiliates.filter((af) => af.CompanyKey !== CompanyKey);
		await tick();
		sortAffiliates();
	};

	$: affiliateChanges = {
		create: $ruleChanges.affiliates?.create?.map(({ id }) => id) ?? [],
		update: $ruleChanges.affiliates?.update?.map(({ id }) => id) ?? [],
		remove: $ruleChanges.affiliates?.remove?.map(({ id }) => id) ?? []
	};
</script>

<div class="w-full h-fit">
	<details class="collapse collapse-arrow">
		<summary class="collapse-title px-0">
			<div class="flex flex-wrap items-center gap-2">
				<div>
					<span class="text-lg font-bold">Affiliates:</span>
					<span class="font-mono">({affiliates.length})</span>
				</div>

				<IconBtn
					icon="mdi:add-circle"
					width={24}
					iconClasses="text-success"
					on:click={() => ui.setModals({ addAffiliate: true })}
				/>

				{#if affiliateChanges.create.length}
					<div class="badge badge-success">Added: {affiliateChanges.create.length}</div>
				{/if}
				{#if affiliateChanges.update.length}
					<div class="badge badge-warning">Modified: {affiliateChanges.update.length}</div>
				{/if}
				{#if affiliateChanges.remove.length}
					<div class="badge badge-error">Removed: {affiliateChanges.remove.length}</div>
				{/if}
			</div>
		</summary>

		<div class="collapse-content pl-2 max-h-[30rem] overflow-auto">
			<div class="space-y-3 mt-1">
				{#each affiliates as { id, CompanyKey }}
					{@const affiliateName =
						masterData.affiliates.find((a) => a.CompanyKey === CompanyKey)?.CompanyName ?? 'Invalid Affiliate'}

					<div
						class="my-card {affiliateChanges.create.includes(id) && 'outline outline-success'} 
                     {affiliateChanges.update.includes(id) && 'outline outline-warning'}"
						style="padding: 4px;"
					>
						<div class="flex items-center gap-1">
							<IconBtn
								icon="mdi:close"
								iconClasses="text-error"
								width={20}
								on:click={() => deleteAffiliate(CompanyKey)}
							/>
							<div>{affiliateName}</div>
						</div>
					</div>
				{:else}
					<div class="text-center mt-4">No Affiliates</div>
				{/each}
			</div>
		</div>
	</details>
</div>
