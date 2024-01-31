<script lang="ts">
	import Icon from '@iconify/svelte';
	import { trpc } from '../../trpc/client';
	import { page } from '$app/stores';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import { ui } from '../../stores/ui.store';
	import { invalidateAll } from '$app/navigation';

	export let data;
	$: ({ rules } = data);

	const deleteRule = async (id: string) => {
		ui.setLoader({ title: 'Deleting Rule' });
		await trpc($page).rule.deleteRole.query({ id }).catch(trpcClientErrorHandler);
		ui.showToast({
			class: 'alert-success',
			title: 'Rule Deleted Successfully'
		});
		invalidateAll();
		ui.setLoader();
	};
</script>

<div class="container mx-auto">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold flex items-end gap-2">
			Rules:
			<span class="font-normal font-mono text-2xl">({rules.length})</span>
		</h1>
		<button class="btn btn-sm btn-success" on:click={async () => ui.navigate('/rules/rule-config')}>
			<Icon icon="mdi:add" width={20} />
			Add Rule
		</button>
	</div>
	<div class="divider mt-1" />

	<div class="flex flex-col gap-4">
		{#each rules as { id, isActive, name, description, createdAt, _count }}
			<div class="indicator w-full">
				<span class="indicator-item badge badge-sm {isActive ? 'badge-success' : 'badge-error'} mt-0.5 mr-0.5" />
				<button
					class="card border shadow px-4 py-2 flex flex-row justify-between items-center w-full"
					on:click={() => ui.navigate(`/rules/rule-config?id=${id}`)}
				>
					<div class="max-w-xs w-full">
						<div class="text-lg font-semibold">{name}</div>
						<div class="tooltip tooltip-info tooltip-right" data-tip={description}>
							<div class="text-sm italic max-w-xs whitespace-nowrap text-ellipsis overflow-hidden">
								{description}
							</div>
						</div>
					</div>

					<div class="card p-2 text-center">
						<div class="text-lg font-semibold font-mono">{createdAt.toLocaleString()}</div>
						<div class="text-sm">Created On</div>
					</div>

					<div class="card p-2 text-center">
						<div class="text-lg font-semibold font-mono text-primary">{_count.affiliates}</div>
						<div class="text-sm">Affiliates</div>
					</div>

					<div class="card p-2 text-center">
						<div class="text-lg font-semibold font-mono text-accent">{_count.operators}</div>
						<div class="text-sm">Operators</div>
					</div>

					<div class="card p-2 text-center">
						<div class="text-lg font-semibold font-mono text-info">{_count.supervisors}</div>
						<div class="text-sm">Supervisors</div>
					</div>

					<div class="card p-2 text-center">
						<div class="text-lg font-semibold font-mono text-warning">{_count.leads}</div>
						<div class="text-sm">Queued Leads</div>
					</div>

					<div class="card p-2 text-center">
						<div class="text-lg font-semibold font-mono text-success">{_count.leads}</div>
						<div class="text-sm">Completed Leads</div>
					</div>
					<Icon icon="mdi:chevron-right" width={24} class="ml-2" />
				</button>
			</div>
		{:else}
			<div class="text-center mt-10">No Rule Found</div>
		{/each}
	</div>
</div>
