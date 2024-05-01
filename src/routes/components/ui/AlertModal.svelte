<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ui, type AlertModalAction } from '../../../stores/ui.store';

	const closeModal = () => ($ui.alertModal = undefined);
	export let title = '';
	export let body = '';
	export let details: string | undefined = undefined;
	export let actions: AlertModalAction[] = [
		{
			name: 'Okay',
			classes: 'btn-primary',
			onClick: closeModal
		}
	];

	let showDetails = false;
</script>

<div class="modal modal-open z-40">
	<div class="modal-box">
		<!-- Title -->
		<div class="flex items-center justify-between">
			<h3 class="font-bold text-lg">{title}</h3>

			{#if details}
				<button on:click={() => (showDetails = !showDetails)}>
					<Icon icon="mdi:information" width="24" class="text-info cursor-pointer" />
				</button>
			{/if}
		</div>

		<!-- Body -->
		{#if body}
			<p class="pt-2">{body}</p>
		{/if}

		<!-- More Details -->
		{#if showDetails}
			<div class="flex rounded-lg mt-4">
				<div class="bg-info w-2 rounded-l-lg"></div>
				<div class="bg-info bg-opacity-20 text-info-content w-full rounded-r-lg p-2 px-3">
					<div class="font-semibold">More Details:</div>
					<div class="text-sm">{details}</div>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		{#if actions}
			<div class="modal-action">
				{#each actions as { name, classes, onClick }}
					<button class="btn btn-sm w-24 {classes}" on:click={onClick ?? closeModal}>
						{name}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
