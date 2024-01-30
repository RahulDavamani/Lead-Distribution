<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../../routes/components/FormControl.svelte';
	import type { SendSMS } from './sendSMS.schema';
	import Variables from '../../../routes/rules/rule-config/components/Variables.svelte';

	export let action: SendSMS;
	export let deleteAction: (id: string) => void;
</script>

<li class="step step-primary">
	<div class="card border shadow-sm p-4 my-2 w-full text-left">
		<div class="flex justify-between">
			<div>
				<span class="font-semibold">Action:</span>
				<span>Send SMS</span>
			</div>
			<button on:click={() => deleteAction(action.id)}>
				<Icon icon="mdi:close" class="cursor-pointer text-error" width={20} />
			</button>
		</div>
		<div class="divider m-0" />
		<!-- <FormControl label="SMS Template" labelClasses="text-sm" classes="w-1/2">
			<input
				type="text"
				placeholder="Type here"
				class="input input-sm input-bordered w-full join-item"
				bind:value={action.smsTemplate}
			/>
		</FormControl> -->
		<FormControl label="SMS Template" bottomLabel={'Max 190 Characters (After Dynamic Variables Replaced)'}>
			<div class="join">
				<textarea
					placeholder="Type here"
					class="textarea textarea-bordered w-full join-item"
					bind:value={action.smsTemplate}
					rows={1}
				/>
				<Variables insertVariable={(v) => (action.smsTemplate += v)} />
			</div>
		</FormControl>
	</div>
</li>
