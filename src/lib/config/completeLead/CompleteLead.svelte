<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { CompleteLead } from './completeLead.schema';

	export let action: CompleteLead;
	export let actionsCount: number;
	export let deleteAction: (id: string) => void;
	export let moveAction: (num: number, dir: 'up' | 'down') => void;
</script>

<li class="step step-primary">
	<div class="card border shadow-sm p-4 my-2 w-full text-left">
		<div class="flex justify-between">
			<div class="flex items-center gap-2">
				<button on:click={() => deleteAction(action.id)}>
					<Icon icon="mdi:close" class="cursor-pointer text-error" width={20} />
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
	</div>
</li>
