<script>
	import FormControl from '../../../components/FormControl.svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
</script>

<div class="text-lg font-semibold mb-2">New Contact to GHL</div>
<FormControl label="New Contact Status" error={$ruleConfig.zodErrors?.ghlContactStatus}>
	<div class="join">
		<select
			placeholder="Type here"
			class="select select-bordered w-full join-item"
			bind:value={$ruleConfig.rule.ghlContactStatus}
		>
			<option>Created</option>
		</select>
		<div class="btn btn-primary join-item">JSON from Text</div>
	</div>
</FormControl>
