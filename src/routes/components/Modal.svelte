<script lang="ts">
	import Icon from '@iconify/svelte';

	export let showModal: boolean = true;
	export let title: string | undefined = undefined;
	export let closeModal: boolean | (() => void) = true;
</script>

{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box">
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
