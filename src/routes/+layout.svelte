<script lang="ts">
	import '../app.css';
	import AlertModal from './components/AlertModal.svelte';
	import Loader from './components/Loader.svelte';
	import Toast from './components/Toast.svelte';
	import { ui } from '../stores/ui.store';

	$: ({ loader } = $ui);
</script>

{#if loader}
	{@const { title, overlay } = loader}
	<Loader {title} overlay={overlay ?? true} />
{/if}

{#if !loader || loader.overlay !== false}
	<slot />
{/if}

<AlertModal />
<Toast />
