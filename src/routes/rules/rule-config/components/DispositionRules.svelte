<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import { nanoid } from 'nanoid';
	import FormControl from '../../../components/FormControl.svelte';
	import Actions from './Actions.svelte';

	$: ({
		rule: { dispositionRules },
		zodErrors
	} = $ruleConfig);

	const addDispositionRule = () => {
		$ruleConfig.rule.dispositionRules = [
			...dispositionRules,
			{
				id: nanoid(),
				dispositions: '',
				count: 0,
				actions: ruleConfig.getNewActions()
			}
		];
	};

	const deleteDispositionRule = async (id: string) => {
		$ruleConfig.rule.dispositionRules = dispositionRules.filter((a) => a.id !== id);
		await tick();
	};
</script>

<div class="flex gap-2 mb-4">
	<div>
		<span class="text-lg font-semibold">Disposition Rules:</span>
		<span class="font-mono">({dispositionRules.length})</span>
	</div>
	<button class="z-10 text-success" on:click={addDispositionRule}>
		<Icon icon="mdi:add-circle" width={24} />
	</button>
</div>

<div class="space-y-4 px-2 mb-2">
	{#each dispositionRules as { id }, i}
		<div class="my-card">
			<div class="flex gap-6 mb-4">
				<FormControl label="Dispositions" classes="w-full" error={zodErrors?.dispositionRules?.[i]?.dispositions}>
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered"
						bind:value={$ruleConfig.rule.dispositionRules[i].dispositions}
						rows={1}
					/>
				</FormControl>

				<FormControl label="Count" classes="max-w-xs w-full" error={zodErrors?.dispositionRules?.[i]?.count}>
					<input
						type="number"
						placeholder="Type here"
						class="input input-bordered w-full join-item"
						bind:value={$ruleConfig.rule.dispositionRules[i].count}
					/>
				</FormControl>
				<button class="btn btn-error mt-10" on:click={() => deleteDispositionRule(id)}>Delete</button>
			</div>

			<Actions actionsName="Actions" bind:actions={$ruleConfig.rule.dispositionRules[i].actions} />
		</div>
	{:else}
		<div class="text-center">No Disposition Notes</div>
	{/each}
</div>

<div class="px-2 mt-4">
	<div class="text-lg font-semibold">Options:</div>
	<FormControl label="Total Dispositions Count" classes="w-1/2 mb-4 px-2" error={zodErrors?.totalDispositionLimit}>
		<input
			type="number"
			placeholder="Type here"
			class="input input-bordered"
			bind:value={$ruleConfig.rule.totalDispositionLimit}
		/>
	</FormControl>

	<div class="space-y-4">
		<Actions actionsName="Disposition Nomatch Actions" bind:actions={$ruleConfig.rule.dispositionsNoMatchActions} />
		<Actions
			actionsName="Disposition Limit Exceeded Actions"
			bind:actions={$ruleConfig.rule.dispositionsLimitExceedActions}
		/>
	</div>
</div>
