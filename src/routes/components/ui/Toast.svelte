<script lang="ts">
	import { onMount } from 'svelte';
	import IconBtn from './IconBtn.svelte';
	import { ui } from '../../../stores/ui.store';

	export let title = '';
	export let toastClasses = '';
	export let alertClasses = '';
	export let toastDuration = 5000;
	const closeToast = () => ($ui.toast = undefined);

	onMount(() => setTimeout(closeToast, toastDuration));
</script>

<div class="toast toast-top toast-start z-50 {toastClasses}">
	<div class="gap-2 alert {alertClasses}">
		<IconBtn icon="mdi:close" on:click={closeToast} />
		<slot name="title">{title}</slot>
	</div>
</div>
