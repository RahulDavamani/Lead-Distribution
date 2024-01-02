<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../components/FormControl.svelte';
	import { onMount } from 'svelte';
	import { ruleConfig } from '../../../stores/ruleConfig.store';
	import Operators from './components/Operators.svelte';
	import Affiliates from './components/Affiliates.svelte';
	import WaitTimeCR from './components/WaitTimeCR.svelte';
	import Notification from './components/Notification.svelte';
	import { ui } from '../../../stores/ui.store';
	import DispositionNotes from './components/DispositionNotes.svelte';

	export let data;
	$: ({ rule, operators, affiliates } = data);
	onMount(() => ruleConfig.init(rule, operators, affiliates));
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
					class="btn btn-sm btn-error {$ruleConfig.rule.id === null && 'btn-disabled'}"
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

		<!-- Outbound Call Number & SMS Template -->
		<div class="flex gap-4">
			<FormControl classes="w-full" label="Outbound Call Number" error={zodErrors?.outboundCallNumber}>
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered"
					bind:value={$ruleConfig.rule.outboundCallNumber}
				/>
			</FormControl>
			<FormControl
				classes="w-full"
				label="SMS Template"
				secLabel="(First message upon lead arrival)"
				secLabelClasses="text-sm"
				error={zodErrors?.smsTemplate}
			>
				<textarea
					placeholder="Type here"
					class="textarea textarea-bordered"
					bind:value={$ruleConfig.rule.smsTemplate}
					rows={1}
				/>
			</FormControl>
		</div>
		<div class="divider" />

		<div class="flex gap-4">
			<Operators />
			<Affiliates />
		</div>
		<div class="divider" />

		<WaitTimeCR />
		<div class="divider" />

		<Notification />
		<div class="divider" />

		<DispositionNotes />
	</div>
{/if}
