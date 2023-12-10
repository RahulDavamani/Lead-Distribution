<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from '../$types';
	import Icon from '@iconify/svelte';
	import { triggerAction } from '../../lib/client/triggerAction';

	$: ({ session } = $page.data as PageData);
	$: urlPath = $page.url.pathname;
</script>

<div class="navbar shadow px-4 flex justify-between">
	<a href="/" class="text-xl font-bold">GenRep</a>
	<div class="flex gap-4">
		<a href="/settings" class="btn btn-link {urlPath !== '/settings' && 'no-underline text-base-content'}">
			<Icon icon="material-symbols:settings-rounded" width={24} />
		</a>
		<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
		<div class="dropdown dropdown-end">
			<div tabindex={0} class="btn btn-ghost btn-circle avatar p-1">
				<img src={session?.user_picture} alt="DP" class="rounded-full" />
			</div>
			<div tabindex={0} class="dropdown-content mt-4 z-[50] bg-base-100 border shadow rounded-box w-64">
				<div class="p-5 pb-2">
					<div class="font-semibold">{session?.user.name}</div>
					<div class="italic">{session?.user.email}</div>
				</div>
				<div class="divider px-4 m-0" />
				<ul class="menu">
					<li>
						<a href="/settings"><Icon icon="material-symbols:settings-rounded" width={20} /> Settings</a>
					</li>
					<li>
						<button on:click={() => triggerAction('/logout')}>
							<Icon icon="material-symbols:logout-rounded" width={20} /> Logout
						</button>
					</li>
				</ul>
			</div>
		</div>
	</div>
</div>
