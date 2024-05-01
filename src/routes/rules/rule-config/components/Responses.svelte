<script lang="ts">
	import { ruleChanges, ruleConfig, ruleErrors } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import { nanoid } from 'nanoid';
	import FormControl from '../../../components/FormControl.svelte';
	import Actions from './Actions.svelte';
	import type { Rule } from '../../../../zod/rule.schema';
	import IconBtn from '../../../components/ui/IconBtn.svelte';

	type ResponseType = 'disposition' | 'sms';

	$: ({
		rule: { responses }
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

	const addResponse = (type: ResponseType) => {
		$ruleConfig.rule.responses = [
			...responses,
			{
				id: nanoid(),
				num: responses.filter((r) => r.type === type).length + 1,
				type,
				values: '',
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

	$: responseChanges = {
		create: $ruleChanges.responses?.create?.map(({ id }) => id) ?? [],
		update: $ruleChanges.responses?.update?.map(({ id }) => id) ?? [],
		remove: $ruleChanges.responses?.remove?.map(({ id }) => id) ?? []
	};
</script>

<details class="collapse collapse-arrow">
	<summary class="collapse-title px-0">
		<div class="flex flex-wrap items-center gap-2">
			<div class="text-lg font-bold">Call Back Disposition & Prospect SMS Verification:</div>

			{#if responseChanges.create.length}
				<div class="badge badge-success">Added: {responseChanges.create.length}</div>
			{/if}
			{#if responseChanges.update.length}
				<div class="badge badge-warning">Modified: {responseChanges.update.length}</div>
			{/if}
			{#if responseChanges.remove.length}
				<div class="badge badge-error">Removed: {responseChanges.remove.length}</div>
			{/if}
		</div>
	</summary>

	<div class="collapse-content px-2">
		<FormControl
			label="Total Max Verification Check"
			classes="w-1/2 mb-4 px-2"
			error={$ruleErrors?.responseOptions?.totalMaxAttempt}
		>
			<input
				type="number"
				placeholder="Type here"
				class="input input-bordered {$ruleErrors?.responseOptions?.totalMaxAttempt && 'input-error'} 
            {$ruleChanges.responseOptions?.totalMaxAttempt && 'input-warning'}"
				bind:value={$ruleConfig.rule.responseOptions.totalMaxAttempt}
			/>
		</FormControl>

		{#each Object.values(responseGroups) as { type, name, responses }}
			<div class="flex items-center gap-2">
				<div>
					<span class="font-semibold">{name} Responses:</span>
					<span class="font-mono">({responses.length})</span>
				</div>

				<IconBtn icon="mdi:add-circle" width={24} iconClasses="text-success" on:click={() => addResponse(type)} />
			</div>
			<div class="mb-2 text-sm">
				{#if type === 'sms'}
					(Only applicable with twilio messaging service)
				{/if}
			</div>

			<div class="space-y-4 px-2 mb-6">
				{#each responses as { id, num }}
					{@const i = $ruleConfig.rule.responses.findIndex((r) => r.id === id)}
					<div
						class="my-card {responseChanges.create.includes(id) && 'outline outline-success'} 
                     {responseChanges.update.includes(id) && 'outline outline-warning'}"
					>
						<div class="flex items-center gap-1 mb-1">
							<IconBtn icon="mdi:close" iconClasses="text-error" width={20} on:click={() => deleteResponse(type, id)} />
							<div class="font-semibold">Response #{num}</div>
						</div>

						<FormControl classes="mb-4" label="Response Values (Contains)" error={$ruleErrors?.responses?.[i]?.values}>
							<textarea
								placeholder="Type here"
								class="textarea textarea-bordered {$ruleErrors?.responses?.[i]?.values && 'textarea-error'}"
								bind:value={$ruleConfig.rule.responses[i].values}
								rows={1}
							/>
						</FormControl>

						<Actions actionsName="Actions" bind:actions={$ruleConfig.rule.responses[i].actions} />
					</div>
				{:else}
					<div class="text-center">No {name} Responses</div>
				{/each}
			</div>
		{/each}

		<div class="font-semibold mb-2">Other Cases:</div>

		<div class="space-y-4">
			<div
				class="hover:outline hover:shadow-lg focus-within:outline focus-within:shadow-lg rounded-box
            {$ruleChanges.responseOptions?.responsesNoMatchActions && 'outline outline-warning'}"
			>
				<Actions
					actionsName="Response Nomatch Actions"
					bind:actions={$ruleConfig.rule.responseOptions.responsesNoMatchActions}
				/>
			</div>
			<div
				class="hover:outline hover:shadow-lg focus-within:outline focus-within:shadow-lg rounded-box
            {$ruleChanges.responseOptions?.responsesLimitExceedActions && 'outline outline-warning'}"
			>
				<Actions
					actionsName="Response Limit Exceeded Actions"
					bind:actions={$ruleConfig.rule.responseOptions.responsesLimitExceedActions}
				/>
			</div>
		</div>
	</div>
</details>
