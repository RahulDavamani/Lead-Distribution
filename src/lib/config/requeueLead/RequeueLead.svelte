<script lang="ts">
	import { timeToText } from '$lib/client/DateTime';
	import Icon from '@iconify/svelte';
	import FormControl from '../../../routes/components/FormControl.svelte';
	import type { RequeueLead } from './requeueLead.schema';

	export let action: RequeueLead;
	export let actionsCount: number;
	export let deleteAction: (id: string) => void;
	export let moveAction: (num: number, dir: 'up' | 'down') => void;
</script>

<li class="step step-primary">
	<div class="card border shadow-sm p-4 my-2 w-full text-left">
		<div class="flex justify-between">
			<div class="flex items-center">
				<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteAction(action.id)}>
					<Icon icon="mdi:close" class="text-error" width={20} />
				</button>
				<div class="font-semibold">Requeue Lead</div>
			</div>
			<div>
				{#if action.num !== 1}
					<button class="btn btn-xs" on:click={() => moveAction(action.num, 'up')}>
						<Icon icon="mdi:arrow-up-thick" class="text-info" width="20" />
					</button>
				{/if}
				{#if action.num !== actionsCount}
					<button class="btn btn-xs ml-2" on:click={() => moveAction(action.num, 'down')}>
						<Icon icon="mdi:arrow-down-thick" class="text-info" width="20" />
					</button>
				{/if}
			</div>
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
