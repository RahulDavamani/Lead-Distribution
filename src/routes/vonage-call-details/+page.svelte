<script lang="ts">
	export let data;
	$: ({ vonageCall, audioUrl } = data);
	$: console.log(data);
</script>

<div class="container mx-auto card border py-4 px-6 mb-20">
	<div class="text-lg font-semibold mb-4">Audio Recording:</div>
	<audio controls>
		<source src={audioUrl} type="audio/wav" />
		Your browser does not support the audio element.
	</audio>
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

<style>
	json-viewer {
		--background-color: oklch(var(--n));
	}
</style>
