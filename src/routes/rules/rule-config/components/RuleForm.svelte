<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import { goto } from '$app/navigation';
	import { ruleChanges, ruleConfig, ruleErrors } from '../../../../stores/ruleConfig.store';
	import { messagingServices } from '$lib/data/messagingServices';
	import Variables from './Variables.svelte';

	$: ({ isCreate, canDelete } = $ruleConfig);
</script>

<div>
	<div class="flex justify-between items-center mb-6 relative">
		<!-- Back Button -->
		<button class="btn btn-sm btn-ghost" on:click={() => goto('/rules')}>
			<Icon icon="mdi:chevron-left" width={22} /> Rules
		</button>

		<!-- Title -->
		<div class="font-bold text-2xl absolute w-fit mx-auto left-0 right-0">Distribution Rule</div>

		<div class="space-x-2">
			<!-- Delete Btn -->
			<button class="btn btn-sm btn-error {!canDelete && 'btn-disabled'}" on:click={ruleConfig.removeRule}>
				<Icon icon="mdi:delete-forever" width={22} /> Delete
			</button>

			<!-- Save Btn -->
			<div class="tooltip tooltip-error" data-tip={$ruleErrors && 'Input Validation Failed'}>
				<button
					class="btn btn-sm btn-success {$ruleErrors && 'btn-disabled'}"
					on:click={isCreate ? ruleConfig.createRule : ruleConfig.updateRule}
				>
					<Icon icon="mdi:content-save" width={22} />
					{isCreate ? 'Create' : 'Update'}
				</button>
			</div>
		</div>
	</div>

	<div class="flex">
		<!-- Rule Name -->
		<FormControl classes="w-full" label="Rule Name" error={$ruleErrors?.name}>
			<input
				type="text"
				placeholder="Type here"
				class="input input-bordered {$ruleErrors?.name && 'input-error'} {$ruleChanges.name && 'input-warning'}"
				bind:value={$ruleConfig.rule.name}
			/>
		</FormControl>

		<!-- IsActive -->
		<div class="form-control mx-10 mt-10">
			<label class="label cursor-pointer gap-3">
				<span class="font-semibold">Active</span>
				<input type="checkbox" class="toggle toggle-success" bind:checked={$ruleConfig.rule.isActive} />
			</label>
		</div>
	</div>

	<!-- Description -->
	<FormControl label="Description">
		<textarea
			placeholder="Type here"
			class="textarea textarea-bordered {$ruleChanges.description && 'textarea-warning'}"
			bind:value={$ruleConfig.rule.description}
		/>
	</FormControl>
	<div class="divider mb-0" />

	<div class="flex items-center gap-2">
		<!-- Outbound Call Number -->
		<FormControl label="Outbound Call Number" classes="w-full" error={$ruleErrors?.outboundCallNumber}>
			<div class="flex gap-4">
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered w-full {$ruleErrors?.outboundCallNumber &&
						'input-error'} {$ruleChanges.outboundCallNumber && 'input-warning'}"
					bind:value={$ruleConfig.rule.outboundCallNumber}
				/>

				<div class="form-control">
					<label class="label cursor-pointer gap-3">
						<span class="font-semibold">Override</span>
						<input
							type="checkbox"
							class="toggle toggle-success"
							bind:checked={$ruleConfig.rule.overrideOutboundNumber}
						/>
					</label>
				</div>
			</div>
		</FormControl>

		<div class="divider divider-horizontal mt-2" />

		<!-- Messaging Service -->
		<FormControl label="SMS Messaging Service" classes="w-full">
			<div class="flex gap-4">
				{#each Object.entries(messagingServices) as [key, value]}
					<FormControl inputType="In" label={value}>
						<input
							type="radio"
							name="messagingService"
							class="radio radio-primary
                     {$ruleChanges.messagingService && $ruleConfig.rule.messagingService === key && 'radio-warning'}"
							value={key}
							bind:group={$ruleConfig.rule.messagingService}
						/>
					</FormControl>
				{/each}
			</div>
		</FormControl>
	</div>

	<!-- SMS Template -->
	<FormControl
		classes="w-full mt-1"
		label="Initial SMS Template"
		secLabel="(First message upon lead arrival)"
		secLabelClasses="text-sm"
		error={$ruleErrors?.smsTemplate}
	>
		<div class="join">
			<textarea
				placeholder="Type here"
				class="textarea textarea-bordered join-item w-full
            {$ruleErrors?.smsTemplate && 'textarea-error'} {$ruleChanges.smsTemplate && 'textarea-warning'}"
				bind:value={$ruleConfig.rule.smsTemplate}
				rows={1}
			/>
			<Variables insertVariable={(v) => ($ruleConfig.rule.smsTemplate += v)} />
		</div>
	</FormControl>
</div>
