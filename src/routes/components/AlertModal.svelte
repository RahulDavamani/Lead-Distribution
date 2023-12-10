<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ui } from '../../stores/ui.store';

	let showDetails = false;
	const closeModal = () => ($ui.alertModal = undefined);
</script>

{#if $ui.alertModal}
	{@const { title, body, details, actions } = $ui.alertModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<!-- Title -->
			<div class="flex items-center justify-between">
				<h3 class="font-bold text-lg">{title}</h3>

				{#if details}
					<button on:click={() => (showDetails = !showDetails)}>
						<Icon icon="material-symbols:info" width="24" class="text-info cursor-pointer" />
					</button>
				{/if}
			</div>

			<!-- Body -->
			{#if body}
				<p class="pt-2">{body}</p>
			{/if}

			<!-- More -->
			{#if showDetails}
				<div class="divider m-0 mt-4" />
				<div class="opacity-70 break-words">
					<div class="font-semibold">More Details:</div>
					{details}
				</div>
			{/if}
			<!-- Actions -->
			{#if actions}
				<div class="modal-action">
					{#each actions as action}
						{@const { name, onClick } = action}
						<button class="btn btn-sm w-24 {action.class}" on:click={onClick ?? closeModal}>
							{name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
