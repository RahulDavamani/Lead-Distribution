<script lang="ts">
	import Icon from '@iconify/svelte';

	export let showModal: boolean = true;
	export let closeModal: boolean | (() => void) = true;
	export let title: string | undefined = undefined;
	export let classes: string = '';
	export let boxClasses: string = '';
</script>

{#if showModal}
	<div class="modal modal-open {classes}">
		<div class="modal-box {boxClasses}">
			<div class="flex justify-between items-center mb-4">
				{#if title}
					<div class="text-lg font-bold">{title}</div>
				{/if}
				{#if closeModal}
					<button
						on:click={() => {
							if (typeof closeModal === 'function') closeModal();
							else showModal = false;
						}}
					>
						<Icon icon="mdi:close" class="cursor-pointer text-error" width={20} />
					</button>
				{/if}
			</div>
			<slot />
		</div>
	</div>
{/if}
