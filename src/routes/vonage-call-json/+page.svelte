<script lang="ts">
	import { JsonView } from '@zerodevx/svelte-json-view';
	export let data;
</script>

<div class="container mx-auto card border p-4">
	<div class="text-lg font-semibold mb-2">Audio Recording:</div>
	<div class="card border p-4 max-w-sm">Audio File soon to be implemented</div>
	<div class="divider" />
	<div class="text-lg font-semibold mb-2">JSON Data:</div>
	<div class="pl-4">
		<JsonView json={data.vonageCallJson} />
	</div>
</div>
