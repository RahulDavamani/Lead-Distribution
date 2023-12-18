<script lang="ts">
	import '../app.css';
	import AlertModal from './components/AlertModal.svelte';
	import Loader from './components/Loader.svelte';
	import Toast from './components/Toast.svelte';
	import { ui } from '../stores/ui.store';
	import '../../node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/flatpickr.css';
	$: ({ loader } = $ui);
</script>

<img src="https://bundlepublic.blob.core.windows.net/bundle/bundle_logo.png" alt="Logo" width="150" class="mb-4" />

{#if loader}
	{@const { title, overlay } = loader}
	<Loader {title} overlay={overlay ?? true} />
{/if}

{#if !loader || loader.overlay !== false}
	<slot />
{/if}

<AlertModal />
<Toast />
