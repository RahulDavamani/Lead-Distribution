<script lang="ts">
	import '../app.css';
	import AlertModal from './components/AlertModal.svelte';
	import Loader from './components/Loader.svelte';
	import Toast from './components/Toast.svelte';
	import { ui } from '../stores/ui.store';
	import '../../node_modules/flatpickr/dist/flatpickr.css';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { onMount } from 'svelte';
	import { auth } from '../stores/auth.store';
	import { page } from '$app/stores';

	$: ({ loader } = $ui);
	let init = false;
	onMount(async () => {
		if (!$auth) await auth.authenticate();
		init = true;
	});

	$: error = (() => {
		if (!init) return;
		if ($page.url.pathname.startsWith('/queue-lead')) return;
		if ($page.url.pathname.startsWith('/complete-lead')) return;
		if ($page.url.pathname.startsWith('/update-disposition')) return;
		if ($page.url.pathname.startsWith('/validate-sms-response')) return;
		if ($page.url.pathname.startsWith('/update-ghl-template')) return;
		if ($page.url.pathname.startsWith('/schedule-callback')) return;
		if ($page.url.pathname.startsWith('/leads-ws')) return;
		if ($page.url.pathname.startsWith('/test')) return;
		if (!$auth) return { code: 401, message: 'Unauthorized' };
		if ($page.url.pathname.startsWith('/rules') && $auth.roleType !== 'ADMIN')
			return { code: 403, message: 'Forbidden' };
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
	{:else if init}
		<slot />
	{/if}
{/if}

<AlertModal />
<Toast />
