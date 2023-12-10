<script lang="ts">
	import Icon from '@iconify/svelte';
	import { trpc } from '../../trpc/client';
	import { page } from '$app/stores';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import { ui } from '../../stores/ui.store';
	import { invalidateAll } from '$app/navigation';

	export let data;
	$: ({ rules } = data);
</script>

<div class="container mx-auto my-10">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold flex items-end gap-2">
			Rules:
			<span class="font-normal font-mono text-2xl">({rules.length})</span>
		</h1>
		<a href="/rules/rule-config" class="btn btn-sm btn-success">
			<Icon icon="mdi:add" width={20} />
			Add Rule
		</a>
	</div>
	<div class="divider mt-1" />
	<div class="flex flex-col gap-4">
		{#each rules as { id, name }}
			<a href={`/rules/rule-config?id=${id}`} class="card border shadow p-4 flex flex-row justify-between">
				<div>{name}</div>
				<button
					class="btn btn-sm btn-square btn-ghost btn-error"
					on:click={async (e) => {
						e.preventDefault();
						ui.setLoader({ title: 'Deleting Rule' });
						await trpc($page).rule.deleteRole.query({ id }).catch(trpcClientErrorHandler);
						ui.showToast({
							class: 'alert-success',
							title: 'Rule Deleted Successfully'
						});
						invalidateAll();
						ui.setLoader();
					}}
				>
					<Icon icon="mdi:delete" width={22} class="text-error" />
				</button>
			</a>
		{:else}
			<div class="text-center mt-10">No Rule Found</div>
		{/each}
	</div>
</div>
