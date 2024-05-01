<script lang="ts">
	import Icon from '@iconify/svelte';

	export let icon: string;
	export let width = 20;
	export let buttonClasses = '';
	export let circleBtn = true;
	export let iconClasses = '';
</script>

<button class="btn btn-sm {circleBtn ? 'btn-circle' : 'btn-square'} btn-ghost {buttonClasses}" on:click>
	<Icon {icon} class={iconClasses} {width} />
</button>
