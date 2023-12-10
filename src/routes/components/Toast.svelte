<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ui } from '../../stores/ui.store';
</script>

{#if $ui.toast}
	{@const { title } = $ui.toast}
	<div class="toast toast-bottom toast-end z-50 p-2">
		<div class="alert {$ui.toast.class} border p-3 pl-6 max-w-lg whitespace-normal">
			{title}
			<button on:click={() => ui.closeToast()}>
				<Icon icon="material-symbols:close" />
			</button>
		</div>
	</div>
{/if}
