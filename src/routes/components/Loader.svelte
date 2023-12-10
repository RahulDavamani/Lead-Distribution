<script lang="ts">
	import { Circle2 } from 'svelte-loading-spinners';
	export let title: string = 'Loading';
	export let size: number = 100;
	export let overlay: boolean = true;
	export let center: boolean = true;
</script>

<div
	class={`${center && 'fixed inset-0'} ${
		overlay ? 'z-50 bg-base-200 bg-opacity-60' : '-z-50'
	} flex flex-col justify-center items-center`}
>
	<Circle2 {size} colorOuter="oklch(var(--p))" colorCenter="oklch(var(--s))" colorInner="oklch(var(--a))" />
	<div class="font-semibold mt-5 bg-base-200 p-2 rounded-box">{title} ...</div>
</div>
