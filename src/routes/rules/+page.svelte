<script lang="ts">
	import Icon from '@iconify/svelte';
	import { trpc } from '../../trpc/client';
	import { page } from '$app/stores';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import { ui } from '../../stores/ui.store';
	import { goto, invalidateAll } from '$app/navigation';

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
		{#each rules as { id, name, description, createdAt, notification, _count, queueLeadsCount, completedLeadsCount }}
			<div class="card border shadow px-4 py-2 flex flex-row justify-between items-center">
				<div>
					<div class="text-lg font-semibold">{name}</div>
					<div class="text-sm italic max-w-xs break-words">
						{description}
					</div>
				</div>

				<div class="card p-2 hover:shadow cursor-default text-center">
					<div class="text-lg font-semibold font-mono">{createdAt.toLocaleString()}</div>
					<div class="text-sm">Created On</div>
				</div>

				<div class="card p-2 hover:shadow cursor-default text-center">
					<div class="text-lg font-semibold font-mono text-primary">{_count.affiliates}</div>
					<div class="text-sm">Affiliates</div>
				</div>

				<div class="card p-2 hover:shadow cursor-default text-center">
					<div class="text-lg font-semibold font-mono text-info">{_count.operators}</div>
					<div class="text-sm">Operators</div>
				</div>

				<div class="card p-2 hover:shadow cursor-default text-center">
					<div class="text-lg font-semibold {notification === null ? 'text-error' : 'text-success'}">
						{notification === null ? 'Disabled' : `Enabled: ${notification._count.notificationAttempts} Attempts`}
					</div>
					<div class="text-sm">Notification</div>
				</div>

				<div class="card p-2 hover:shadow cursor-default text-center">
					<div class="text-lg font-semibold font-mono text-warning">{queueLeadsCount}</div>
					<div class="text-sm">Queued Leads</div>
				</div>

				<div class="card p-2 hover:shadow cursor-default text-center">
					<div class="text-lg font-semibold font-mono text-success">{completedLeadsCount}</div>
					<div class="text-sm">Completed Leads</div>
				</div>

				<div class="flex gap-2">
					<button class="btn btn-sm btn-square btn-info" on:click={() => ui.navigate(`/rules/rule-config?id=${id}`)}>
						<Icon icon="mdi:edit" width={20} />
					</button>
					<button
						class="btn btn-sm btn-square btn-error"
						on:click={async (e) => {
							e.preventDefault();
							deleteRule(id);
						}}
					>
						<Icon icon="mdi:delete" width={20} />
					</button>
				</div>
			</div>
		{:else}
			<div class="text-center mt-10">No Rule Found</div>
		{/each}
	</div>
</div>
