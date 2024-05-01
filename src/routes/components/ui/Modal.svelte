<script lang="ts">
	import { ui } from '../../../stores/ui.store';
	import IconBtn from './IconBtn.svelte';

	export let title = '';
	export let closeBtn = true;

	export let classes = '';
	export let boxClasses = '';
</script>

<div class="modal modal-open {classes} z-30">
	<div class="modal-box {boxClasses}">
		<div class="flex justify-between items-center">
			<div class="text-lg font-bold">{title}</div>

			{#if closeBtn}
				<IconBtn icon="mdi:close" iconClasses="text-error" on:click={() => ui.setModals()} />
			{:else}
				<div />
			{/if}
		</div>
		<div class="divider mt-0 mb-2" />
		<slot />
	</div>
</div>
