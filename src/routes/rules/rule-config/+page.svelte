<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../components/FormControl.svelte';
	import { ruleConfig } from '../../../stores/ruleConfig.store';
	import Operators from './components/Operators.svelte';
	import Affiliates from './components/Affiliates.svelte';
	import NotificationAttempts from './components/NotificationAttempts.svelte';
	import { ui } from '../../../stores/ui.store';
	import Responses from './components/Responses.svelte';
	import Supervisors from './components/Supervisors.svelte';
	import Variables from './components/Variables.svelte';

	export let data;
	$: ({ rule, operators, affiliates, canDelete } = data);
	$: ruleConfig.init(rule, operators, affiliates);
</script>

{#if $ruleConfig.init}
	{@const { zodErrors } = $ruleConfig}

	<div class="container mx-auto mb-20">
		<div class="flex justify-between items-center mb-6 relative">
			<!-- Back Button -->
			<button class="btn btn-sm btn-ghost" on:click={() => ui.navigate('/rules')}>
				<Icon icon="mdi:chevron-left" width={22} /> Rules
			</button>

			<!-- Title -->
			<div class="font-bold text-2xl absolute w-fit mx-auto left-0 right-0">Distribution Rule</div>

			<!-- Save & Delete Buttons -->
			<div class="space-x-2">
				<button
					class="btn btn-sm btn-error {(rule?.id === null || !canDelete) && 'btn-disabled'}"
					on:click={ruleConfig.deleteRule}
				>
					<Icon icon="mdi:delete-forever" width={22} />
					Delete
				</button>
				<button class="btn btn-sm btn-success" on:click={ruleConfig.saveRule}>
					<Icon icon="mdi:content-save" width={22} />
					Save
				</button>
			</div>
		</div>

		<!-- Rule Name & IsActive -->
		<div class="flex items-end">
			<FormControl classes="w-full" label="Rule Name" error={zodErrors?.name}>
				<input type="text" placeholder="Type here" class="input input-bordered" bind:value={$ruleConfig.rule.name} />
			</FormControl>

			<div class="form-control mx-10">
				<label class="label cursor-pointer gap-3">
					<span class="font-semibold">Active</span>
					<input type="checkbox" class="toggle toggle-success" bind:checked={$ruleConfig.rule.isActive} />
				</label>
			</div>
		</div>

		<!-- Description -->
		<FormControl label="Description" error={zodErrors?.description}>
			<textarea placeholder="Type here" class="textarea textarea-bordered" bind:value={$ruleConfig.rule.description} />
		</FormControl>

		<div class="flex gap-4">
			<!-- Outbound Call Number-->
			<FormControl label="Outbound Call Number" error={zodErrors?.outboundCallNumber}>
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered"
					bind:value={$ruleConfig.rule.outboundCallNumber}
				/>
			</FormControl>

			<!-- GHL Post Data -->
			<!-- <div class="form-control whitespace-nowrap">
				<div class="label font-semibold gap-4">
					<div>GHL Post Data</div>
					<div class="tooltip" data-tip="This data will sent to ghl at the time lead arrival">
						<Icon icon="mdi:information-variant-circle" width={22} class="text-info" />
					</div>
				</div>
				<button class="btn btn-primary" on:click={() => (showModal = true)}> Configure Data </button>
			</div> -->

			<!-- SMS Template -->
			<FormControl
				classes="w-full"
				label="SMS Template"
				secLabel="(First message upon lead arrival)"
				secLabelClasses="text-sm"
				error={zodErrors?.smsTemplate}
			>
				<div class="join">
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered join-item w-full"
						bind:value={$ruleConfig.rule.smsTemplate}
						rows={1}
					/>
					<Variables insertVariable={(v) => ($ruleConfig.rule.smsTemplate += v)} />
				</div>
			</FormControl>
		</div>
		<div class="divider" />

		<div class="flex gap-4">
			<Operators />
			<Affiliates />
		</div>
		<div class="divider mb-0" />

		<NotificationAttempts />
		<div class="divider m-0" />

		<Supervisors />
		<div class="divider m-0" />

		<Responses />
	</div>
{/if}
