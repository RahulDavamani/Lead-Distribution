<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import { nanoid } from 'nanoid';
	import FormControl from '../../../components/FormControl.svelte';
	import Actions from './Actions.svelte';
	import type { Rule } from '../../../../zod/rule.schema';

	type ResponseType = 'disposition' | 'sms';

	$: ({
		rule: { responses },
		zodErrors
	} = $ruleConfig);
	$: responseGroups = {
		disposition: {
			type: 'disposition',
			name: 'Call Disposition',
			responses: responses.filter((r) => r.type === 'disposition')
		},
		sms: {
			type: 'sms',
			name: 'Customer SMS',
			responses: responses.filter((r) => r.type === 'sms')
		}
	} as { [key: string]: { type: ResponseType; name: string; responses: Rule['responses'] } };
	$: console.log(responseGroups);

	const addResponse = (type: ResponseType) => {
		$ruleConfig.rule.responses = [
			...responses,
			{
				id: nanoid(),
				num: responses.filter((r) => r.type === type).length + 1,
				type,
				values: '',
				maxAttempt: 0,
				actions: ruleConfig.getNewActions()
			}
		];
	};

	const sortResponses = (type: ResponseType) =>
		($ruleConfig.rule.responses = [
			responses.filter((r) => r.type !== type),
			responses
				.filter((r) => r.type === type)
				.sort((a, b) => a.num - b.num)
				.map((r, i) => ({ ...r, num: i + 1 }))
		].flat());

	const deleteResponse = async (type: ResponseType, id: string) => {
		$ruleConfig.rule.responses = responses.filter((r) => r.id !== id);
		await tick();
		sortResponses(type);
	};
</script>

<details class="collapse collapse-arrow">
	<summary class="collapse-title px-0">
		<div class="text-lg font-bold">Call Back Disposition & Prospect SMS Verification:</div>
	</summary>

	<div class="collapse-content px-2">
		<FormControl
			label="Total Max Verification Check"
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

		{#each Object.values(responseGroups) as { type, name, responses }}
			<div class="flex gap-2 mb-2">
				<div>
					<span class="font-semibold">{name} Responses:</span>
					<span class="font-mono">({responses.length})</span>
				</div>
				<button class="z-10 text-success" on:click={() => addResponse(type)}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>

			<div class="space-y-4 px-2 mb-6">
				{#each responses as { id, num }}
					{@const i = $ruleConfig.rule.responses.findIndex((r) => r.id === id)}
					<div class="my-card">
						<div class="flex items-center mb-1">
							<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteResponse(type, id)}>
								<Icon icon="mdi:close" class="text-error" width={20} />
							</button>
							<div class="font-semibold">Response #{num}</div>
						</div>

						<div class="flex gap-6 mb-4">
							<FormControl
								classes="w-full"
								label="Response Values (Contains)"
								error={zodErrors?.responses?.[i]?.values}
							>
								<textarea
									placeholder="Type here"
									class="textarea textarea-bordered"
									bind:value={$ruleConfig.rule.responses[i].values}
									rows={1}
								/>
							</FormControl>

							<FormControl
								label="Max Verification Check"
								classes="max-w-xs w-full"
								error={zodErrors?.responses?.[i]?.maxAttempt}
							>
								<input
									type="number"
									placeholder="Type here"
									class="input input-bordered w-full join-item"
									bind:value={$ruleConfig.rule.responses[i].maxAttempt}
								/>
							</FormControl>
						</div>

						<Actions actionsName="Actions" bind:actions={$ruleConfig.rule.responses[i].actions} />
					</div>
				{:else}
					<div class="text-center">No {name} Responses</div>
				{/each}
			</div>
		{/each}

		<div class="font-semibold mb-2">Other Cases:</div>

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
</details>
