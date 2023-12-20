<script lang="ts">
	import Icon from '@iconify/svelte';

	export let data;
	$: ({ vonageCall, audioUrl } = data);
	$: console.log(data.audioUrl);
	$: console.log(data.vonageCall);

	const convertSecondsToHMS = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;

		let formattedTime = '';
		if (hours > 0) formattedTime += `${hours} hrs`;
		if (minutes > 0) formattedTime += `${formattedTime.length > 0 ? ', ' : ''}${minutes} mins`;
		if (remainingSeconds > 0 || formattedTime === '')
			formattedTime += `${formattedTime.length > 0 ? ', ' : ''}${remainingSeconds} secs`;

		return formattedTime;
	};
</script>

<div class="container mx-auto mb-20">
	<button class="btn btn-sm btn-ghost text-base mb-2" on:click={() => history.back()}>
		<Icon icon="mdi:chevron-left" width={22} /> Leads
	</button>

	<div class="card border py-4 px-6">
		<div class="flex gap-10">
			<div class="w-1/2">
				<div class="text-lg font-semibold mb-4">Audio Recording:</div>
				<audio controls class="w-full">
					<source src={audioUrl} type="audio/wav" />
					Your browser does not support the audio element.
				</audio>
			</div>
			<div class="w-1/2">
				<div class="card border p-4 h-full">
					<div class="text-lg font-semibold mb-2">Call Details:</div>
					<div class="grid grid-cols-2 space-y-1 gap-x-4 pl-2">
						<div>
							<span class="font-semibold">Status:</span>
							<span>{vonageCall.Status ?? 'N/A'}</span>
						</div>
						<div>
							<span class="font-semibold">Direction:</span>
							<span>{vonageCall.Direction ?? 'N/A'}</span>
						</div>
						<div>
							<span class="font-semibold">From:</span>
							<span>{vonageCall.ConnectFrom ?? 'N/A'}</span>
						</div>
						<div>
							<span class="font-semibold">To:</span>
							<span>{vonageCall.ConnectTo ?? 'N/A'}</span>
						</div>
						<div>
							<span class="font-semibold">Created On:</span>
							<span>{vonageCall.CreatedOn ? new Date(vonageCall.CreatedOn).toLocaleString() : 'N/A'}</span>
						</div>
						<div>
							<span class="font-semibold">Start:</span>
							<span>{vonageCall.Start ? new Date(vonageCall.Start).toLocaleString() : 'N/A'}</span>
						</div>
						<div>
							<span class="font-semibold">Rec Duration:</span>
							<span>{convertSecondsToHMS(vonageCall.RecDuration ?? 0)}</span>
						</div>
						<div>
							<span class="font-semibold">Interaction Plan:</span>
							<span>{vonageCall.InteractionPlan ?? 'N/A'}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="divider" />

		<div class="text-lg font-semibold mb-4">JSON DATA:</div>
		{#if vonageCall.JsonText}
			<div class="px-4 mx-2 bg-neutral rounded-box">
				<json-viewer data={JSON.parse(vonageCall.JsonText)}></json-viewer>
			</div>
		{:else}
			<div>No Data Found</div>
		{/if}
	</div>
</div>

<style>
	json-viewer {
		--background-color: oklch(var(--n));
	}
</style>
