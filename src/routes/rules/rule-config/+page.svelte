<script lang="ts">
	import { ruleConfig } from '../../../stores/ruleConfig.store';
	import { onMount } from 'svelte';
	import Loader from '../../components/ui/Loader.svelte';
	import RuleForm from './components/RuleForm.svelte';
	import Affiliates from './components/Affiliates.svelte';
	import Operators from './components/Operators.svelte';
	import Supervisors from './components/Supervisors.svelte';
	import NotificationAttempts from './components/NotificationAttempts.svelte';
	import Escalations from './components/Escalations.svelte';
	import Responses from './components/Responses.svelte';
	import Companies from './components/Companies.svelte';

	onMount(ruleConfig.init);
</script>

{#if !$ruleConfig.init}
	<Loader title="Fetching Rule" overlay={false} />
{:else}
	<div class="container mx-auto mb-20">
		<RuleForm />
		<div class="divider mb-0" />

		<div class="flex">
			<Affiliates />
			<div class="divider divider-horizontal m-0" />
			<Companies />
		</div>
		<div class="divider m-0" />

		<div class="flex">
			<Operators />
			<div class="divider divider-horizontal m-0" />
			<Supervisors />
		</div>
		<div class="divider m-0" />

		<NotificationAttempts />
		<div class="divider m-0" />

		<Escalations />
		<div class="divider m-0" />

		<Responses />
	</div>
{/if}
