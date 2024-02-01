<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import { nanoid } from 'nanoid';
	import FormControl from '../../../components/FormControl.svelte';
	import Actions from './Actions.svelte';
	import { ruleResponseTypes } from '$lib/data/ruleResponseTypes';

	$: ({
		rule: { responses },
		zodErrors
	} = $ruleConfig);

	const addResponse = () => {
		$ruleConfig.rule.responses = [
			...responses,
			{
				id: nanoid(),
				num: responses.length + 1,
				type: 'disposition',
				values: '',
				maxAttempt: 0,
				actions: ruleConfig.getNewActions()
			}
		];
	};
	const sortResponses = () =>
		($ruleConfig.rule.responses = responses.sort((a, b) => a.num - b.num).map((r, i) => ({ ...r, num: i })));

	const deleteResponse = async (id: string) => {
		$ruleConfig.rule.responses = responses.filter((r) => r.id !== id);
		await tick();
		sortResponses();
	};
</script>

<div class="flex gap-2 mb-4">
	<div>
		<span class="text-lg font-semibold">Responses:</span>
		<span class="font-mono">({responses.length})</span>
	</div>
	<button class="z-10 text-success" on:click={addResponse}>
		<Icon icon="mdi:add-circle" width={24} />
	</button>
</div>

<div class="space-y-4 px-2 mb-2">
	{#each responses as { id }, i}
		<div class="my-card">
			<div class="font-semibold">Response Type</div>
			<div class="flex gap-4">
				{#each Object.entries(ruleResponseTypes) as [key, name]}
					<FormControl inputType="In" label={name}>
						<input
							type="radio"
							name="eligibilityTarget"
							class="radio radio-sm radio-primary"
							value={key}
							bind:group={$ruleConfig.rule.responses[i].type}
						/>
					</FormControl>
				{/each}
			</div>
			<div class="flex gap-6 mb-4">
				<FormControl classes="w-full" label="Response Values (Contains)" error={zodErrors?.responses?.[i]?.values}>
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered"
						bind:value={$ruleConfig.rule.responses[i].values}
						rows={1}
					/>
				</FormControl>

				<FormControl label="Max Response Check" classes="max-w-xs w-full" error={zodErrors?.responses?.[i]?.maxAttempt}>
					<input
						type="number"
						placeholder="Type here"
						class="input input-bordered w-full join-item"
						bind:value={$ruleConfig.rule.responses[i].maxAttempt}
					/>
				</FormControl>
				<button class="btn btn-error mt-10" on:click={() => deleteResponse(id)}>Delete</button>
			</div>

			<Actions actionsName="Actions" bind:actions={$ruleConfig.rule.responses[i].actions} />
		</div>
	{:else}
		<div class="text-center">No Responses</div>
	{/each}
</div>

<div class="px-2 mt-4">
	<div class="text-lg font-semibold">Options:</div>
	<FormControl
		label="Maximum Number of Response Check"
		classes="w-1/2 mb-4 px-2"
		error={zodErrors?.responseOptions?.totalMaxAttempt}
	>
		<input
			type="number"
			placeholder="Type here"
			class="input input-bordered"
			bind:value={$ruleConfig.rule.responseOptions.totalMaxAttempt}
		/>
	</FormControl>

	<div class="space-y-4">
		<Actions
			actionsName="Response Nomatch Actions"
			bind:actions={$ruleConfig.rule.responseOptions.responsesNoMatchActions}
		/>
		<Actions
			actionsName="Response Limit Exceeded Actions"
			bind:actions={$ruleConfig.rule.responseOptions.responsesLimitExceedActions}
		/>
	</div>
</div>
