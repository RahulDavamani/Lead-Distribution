<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import Variables from './Variables.svelte';
	import { nanoid } from 'nanoid';
	import { tick } from 'svelte';
	import DurationPicker from '../../../components/DurationPicker.svelte';

	$: ({
		rule: { escalations },
		zodErrors
	} = $ruleConfig);

	const addEscalation = () =>
		($ruleConfig.rule.escalations = [
			...escalations,
			{
				id: nanoid(),
				num: escalations.length + 1,
				messageTemplate: '',
				waitTime: 0
			}
		]);

	const moveEscalation = (i: number, dir: 'up' | 'down') => {
		const temp = escalations[i];

		if (dir === 'up') {
			escalations[i] = { ...escalations[i - 1], num: i + 1 };
			escalations[i - 1] = { ...temp, num: i };
		} else if (dir === 'down') {
			escalations[i] = { ...escalations[i + 1], num: i + 1 };
			escalations[i + 1] = { ...temp, num: i + 2 };
		}
		$ruleConfig.rule.escalations = escalations;
	};

	const sortEscalations = () =>
		($ruleConfig.rule.escalations = escalations.sort((a, b) => a.num - b.num).map((a, i) => ({ ...a, num: i + 1 })));

	const deleteEscalation = async (num: number) => {
		$ruleConfig.rule.escalations = escalations.filter((a) => a.num !== num);
		await tick();
		sortEscalations();
	};
</script>

<details class="collapse collapse-arrow overflow-visible">
	<summary class="collapse-title px-0">
		<div class="flex gap-2">
			<div>
				<span class="text-lg font-bold">Escalation:</span>
				<span class="font-mono">({escalations.length})</span>
			</div>
			<button class="z-10 text-success" on:click={addEscalation}>
				<Icon icon="mdi:add-circle" width={24} />
			</button>
		</div>
	</summary>
	<div class="collapse-content p-0">
		<div class="space-y-4 px-2">
			{#each escalations as { num }, i}
				<div class="my-card">
					<div class="flex justify-between">
						<div class="flex items-center mb-1">
							<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteEscalation(num)}>
								<Icon icon="mdi:close" class="text-error" width={20} />
							</button>
							<div class="font-semibold">Escalation #{num}</div>
						</div>
						<div>
							{#if i !== 0}
								<button class="btn btn-xs" on:click={() => moveEscalation(i, 'up')}>
									<Icon icon="mdi:arrow-up-thick" class="text-info" width="20" />
								</button>
							{/if}
							{#if i !== escalations.length - 1}
								<button class="btn btn-xs ml-2" on:click={() => moveEscalation(i, 'down')}>
									<Icon icon="mdi:arrow-down-thick" class="text-info" width="20" />
								</button>
							{/if}
						</div>
					</div>
					<div class="divider m-0" />

					<div class="flex gap-6">
						<FormControl
							label="Escalation Message Template"
							classes="w-full"
							bottomLabel={'Max 190 Characters (After Variables Replaced)'}
							error={zodErrors?.escalations?.[i]?.messageTemplate}
						>
							<div class="join">
								<textarea
									placeholder="Type here"
									class="textarea textarea-sm textarea-bordered w-full join-item"
									bind:value={$ruleConfig.rule.escalations[i].messageTemplate}
									rows={1}
								/>
								<Variables
									variables={['LeadStatus']}
									insertVariable={(v) => ($ruleConfig.rule.escalations[i].messageTemplate += v)}
								/>
							</div>
						</FormControl>

						<FormControl label="Wait Time" error={zodErrors?.escalations?.[i]?.waitTime}>
							<DurationPicker bind:duration={$ruleConfig.rule.escalations[i].waitTime} />
						</FormControl>
					</div>
				</div>
			{:else}
				<div class="text-center">No Escalations</div>
			{/each}
		</div>
	</div>
</details>
