<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { CompleteLead } from './completeLead.schema';
	import FormControl from '../../../routes/components/FormControl.svelte';
	import { completeLeadStatuses } from './completeLeadStatuses';

	export let action: CompleteLead;
	export let actionsCount: number;
	export let deleteAction: (id: string) => void;
	export let moveAction: (num: number, dir: 'up' | 'down') => void;
</script>

<li class="step step-primary">
	<div class="w-full my-card my-2">
		<div class="flex justify-between">
			<div class="flex items-center">
				<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteAction(action.id)}>
					<Icon icon="mdi:close" class="text-error" width={20} />
				</button>
				<div class="font-semibold">Complete Lead</div>
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
		<div class="flex items-end gap-6">
			<div class="form-control">
				<label class="label cursor-pointer gap-3">
					<span class="font-semibold">Success</span>
					<input type="checkbox" class="toggle toggle-success" bind:checked={action.success} />
				</label>
			</div>

			<FormControl classes="w-full" label="Complete Status">
				<select placeholder="Type here" class="select select-bordered" bind:value={action.completeStatus}>
					<option value="" disabled>Select Status</option>
					{#each completeLeadStatuses as cs}
						<option value={cs}>{cs}</option>
					{/each}
				</select>
			</FormControl>
		</div>
	</div>
</li>
