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
	{@const { rule, zodErrors, operators, affiliates } = $ruleConfig}
	<div class="font-bold text-2xl text-center mt-10">Distribution Rule</div>

	<div class="container mx-auto mb-20">
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
