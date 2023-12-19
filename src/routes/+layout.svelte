<script lang="ts">
	import '../app.css';
	import AlertModal from './components/AlertModal.svelte';
	import Loader from './components/Loader.svelte';
	import Toast from './components/Toast.svelte';
	import { ui } from '../stores/ui.store';
	import '../../node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/flatpickr.css';
	import { afterUpdate, onMount } from 'svelte';
	import { auth } from '../stores/auth.store';
	import { page } from '$app/stores';

	$: ({ loader } = $ui);
	onMount(async () => {
		if (!$auth.isAuth) auth.authenticate();
	});
	$: error = (() => {
		if ($page.url.pathname.startsWith('/view-lead')) return;
		if ($page.url.pathname.startsWith('/lead-distribute')) return;
		if ($page.url.pathname.startsWith('/test')) return;
		if (!$auth.isAuth) return { code: 401, message: 'Unauthorized' };
		if ($page.url.pathname.startsWith('/rules') && !auth.isAdmin()) return { code: 403, message: 'Forbidden' };
	})() as { code: number; message: string } | undefined;
</script>

<img src="https://bundlepublic.blob.core.windows.net/bundle/bundle_logo.png" alt="Logo" width="150" class="mb-4" />

{#if loader}
	{@const { title, overlay } = loader}
	<Loader {title} overlay={overlay ?? true} />
{/if}

{#if !loader || loader.overlay !== false}
	{#if error}
		<div class="card border shadow-lg py-6 px-2 max-w-sm mx-auto text-center mt-40">
			<div class="text-4xl font-bold font-mono">{error.code}</div>
			<div class="text-2xl">{error.message}</div>
		</div>
	{:else}
		<slot />
	{/if}
{/if}

<AlertModal />
<Toast />
