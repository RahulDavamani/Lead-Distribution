<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import { tick } from 'svelte';
	import DynamicVariables from './DynamicVariables.svelte';
	import { timeToText } from '$lib/client/DateTime';

	$: ({
		rule: { dispositionRules },
		zodErrors
	} = $ruleConfig);

	const addDispositionNote = () => {
		$ruleConfig.rule.dispositionRules = [
			...dispositionRules,
			{
				id: null,
				num: dispositionRules.length + 1,
				dispositions: '',
				smsTemplate: '',
				requeueTime: 0
			}
		];
	};

	const sortDispositionRules = () => {
		$ruleConfig.rule.dispositionRules = dispositionRules
			.sort((a, b) => a.num - b.num)
			.map((a, i) => ({ ...a, num: i + 1 }));
	};

	const deleteDispositionNote = async (num: number) => {
		$ruleConfig.rule.dispositionRules = dispositionRules.filter((a) => a.num !== num);
		await tick();
		sortDispositionRules();
	};
</script>

<div class="flex justify-between items-center mb-4">
	<div class="flex gap-2">
		<div class="text-lg font-semibold">Disposition Rules:</div>
		<button class="z-10 text-success" on:click={addDispositionNote}>
			<Icon icon="mdi:add-circle" width={24} />
		</button>
	</div>
	<DynamicVariables />
</div>

<div class="space-y-4 px-2 mb-2">
	{#each dispositionRules as { num }, i}
		<div class="card border-2 p-4">
			<div class="flex justify-start items-center gap-2 mb-1">
				<button on:click={() => deleteDispositionNote(num)}>
					<Icon icon="mdi:close" class="text-error" width="20" />
				</button>
				<div class="font-semibold">Call Disposition #{num}</div>
			</div>
			<div class="flex gap-6">
				<FormControl label="Dispositions" classes="w-full" error={zodErrors?.dispositionRules?.[i]?.dispositions}>
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered join-item"
						bind:value={$ruleConfig.rule.dispositionRules[i].dispositions}
					/>
				</FormControl>
				<FormControl
					label="SMS Template"
					classes="w-full"
					bottomLabel={'Max 190 Characters (After Dynamic Variables Replaced)'}
					error={zodErrors?.dispositionRules?.[i]?.smsTemplate}
				>
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered join-item"
						bind:value={$ruleConfig.rule.dispositionRules[i].smsTemplate}
					/>
				</FormControl>
				<FormControl
					label="Requeue Time"
					classes="max-w-xs w-full"
					bottomLabel={`Time: ${timeToText($ruleConfig.rule.dispositionRules[i].requeueTime)}`}
					error={zodErrors?.dispositionRules?.[i]?.requeueTime}
				>
					<div class="join">
						<input
							type="number"
							placeholder="Type here"
							class="input input-bordered w-full join-item"
							bind:value={$ruleConfig.rule.dispositionRules[i].requeueTime}
						/>
						<div class="btn join-item no-animation cursor-default">sec</div>
					</div>
				</FormControl>
			</div>
		</div>
	{:else}
		<div class="text-center">No Disposition Notes</div>
	{/each}
</div>
