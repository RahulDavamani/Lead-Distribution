<script lang="ts">
	import { timeToText } from '$lib/client/DateTime';
	import Icon from '@iconify/svelte';
	import FormControl from '../../../routes/components/FormControl.svelte';
	import type { RequeueLead } from './requeueLead.schema';

	export let action: RequeueLead;
	export let deleteAction: (id: string) => void;
</script>

<li class="step step-primary">
	<div class="card border shadow-sm p-4 my-2 w-full text-left">
		<div class="flex justify-between">
			<div>
				<span class="font-semibold">Action:</span>
				<span>Requeue Lead</span>
			</div>
			<button on:click={() => deleteAction(action.id)}>
				<Icon icon="mdi:close" class="cursor-pointer text-error" width={20} />
			</button>
		</div>
		<div class="divider m-0" />
		<FormControl
			label="Requeue Time"
			labelClasses="text-sm"
			classes="w-1/2"
			bottomLabel={`Time: ${timeToText(action.requeueTime)}`}
		>
			<div class="join">
				<input
					type="number"
					placeholder="Type here"
					class="input input-sm input-bordered w-full join-item"
					bind:value={action.requeueTime}
				/>
				<div class="btn btn-sm join-item no-animation cursor-default">sec</div>
			</div>
		</FormControl>
	</div>
</li>
