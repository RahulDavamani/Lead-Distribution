<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../components/FormControl.svelte';
	import { onMount } from 'svelte';
	import { ruleConfig } from '../../../stores/ruleConfig.store';
	import Operators from './components/Operators.svelte';
	import Affiliates from './components/Affiliates.svelte';
	import GHLContract from './components/GHLContract.svelte';
	import WaitTimeCR from './components/WaitTimeCR.svelte';
	import Notification from './components/Notification.svelte';

	export let data;
	$: ({ rule, operators, affiliates } = data);
	onMount(() => ruleConfig.init(rule, operators, affiliates));
</script>

{#if $ruleConfig.init}
	{@const { zodErrors } = $ruleConfig}

	<div class="container mx-auto mt-10 mb-20">
		<div class="flex justify-between items-center mb-6 relative">
			<a href="/rules" class="btn btn-sm btn-ghost">
				<Icon icon="mdi:chevron-left" width={22} /> Rules
			</a>
			<div class="font-bold text-2xl absolute w-fit mx-auto left-0 right-0">Distribution Rule</div>
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

		<FormControl label="Rule Name" error={zodErrors?.name}>
			<input type="text" placeholder="Type here" class="input input-bordered" bind:value={$ruleConfig.rule.name} />
		</FormControl>
		<FormControl label="Description" error={zodErrors?.description}>
			<textarea placeholder="Type here" class="textarea textarea-bordered" bind:value={$ruleConfig.rule.description} />
		</FormControl>
		<div class="divider" />

		<div class="flex gap-4">
			<Operators />
			<Affiliates />
		</div>
		<div class="divider" />

		<GHLContract />
		<div class="divider" />

		<WaitTimeCR />
		<div class="divider" />

		<Notification />
	</div>
{/if}
