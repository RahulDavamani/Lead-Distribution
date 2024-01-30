<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { CompleteLead } from './completeLead.schema';

	export let action: CompleteLead;
	export let deleteAction: (id: string) => void;
</script>

<li class="step step-primary">
	<div class="card border shadow-sm p-4 my-2 w-full text-left">
		<div class="flex justify-between">
			<div>
				<span class="font-semibold">Action:</span>
				<span>Complete Lead</span>
			</div>
			<button on:click={() => deleteAction(action.id)}>
				<Icon icon="mdi:close" class="cursor-pointer text-error" width={20} />
			</button>
		</div>
	</div>
</li>
