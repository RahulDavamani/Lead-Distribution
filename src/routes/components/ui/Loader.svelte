<script lang="ts">
	import { Circle2 } from 'svelte-loading-spinners';

	export let title = 'Loading';
	export let percent: string | undefined = undefined;
	export let size = 100;
	export let overlay = true;
	export let fixed = true;

	export let classes = '';
	export let titleClass = '';
</script>

<div
	class="{fixed && 'fixed inset-0'}
   {overlay ? 'z-50 bg-base-200 bg-opacity-60' : '-z-50'} 
   flex flex-col justify-center items-center {classes}"
>
	<slot name="loader">
		<Circle2 {size} colorOuter="oklch(var(--p))" colorCenter="oklch(var(--s))" colorInner="oklch(var(--a))" />
	</slot>

	<slot name="title">
		<div class="font-semibold mt-5 bg-base-200 p-2 rounded-box {titleClass}">{title} ...</div>
	</slot>
</div>

{#if percent}
	<div class="fixed inset-0 flex flex-col justify-center items-center mb-14 z-50 font-mono font-semibold">
		{percent}%
	</div>
{/if}
