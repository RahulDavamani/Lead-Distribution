<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ui } from '../../stores/ui.store';
	import { trpc } from '../../trpc/client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { trpcClientErrorHandler } from '../../trpc/trpcErrorhandler';
	import Loader from '../components/ui/Loader.svelte';
	import IconBtn from '../components/ui/IconBtn.svelte';
	import type { inferRouterOutputs } from '@trpc/server';
	import type { AppRouter } from '../../trpc/routers/app.router';
	import { onMount } from 'svelte';

	type Rule = inferRouterOutputs<AppRouter>['rule']['getAll']['rules'][number];
	let rules: Rule[] | undefined;

	const fetchRules = async () => {
		rules = undefined;
		const data = await trpc($page).rule.getAll.query().catch(trpcClientErrorHandler);
		rules = data.rules;
	};
	onMount(fetchRules);

	let search = '';
	$: filteredRules = rules?.filter((rule) =>
		rule.name.replaceAll(' ', '').toLowerCase().includes(search.replaceAll(' ', '').toLowerCase())
	);

	const showDuplicateAlert = (id: string) =>
		($ui.alertModal = {
			title: `Do you want to duplicate?`,
			actions: [
				{
					name: 'Cancel',
					classes: 'btn-error',
					onClick: () => ($ui.alertModal = undefined)
				},
				{
					name: 'Duplicate',
					classes: 'btn-success',
					onClick: ui.loaderWrapper({ title: 'Duplicating Rule' }, async () => {
						$ui.alertModal = undefined;
						await trpc($page).rule.duplicate.mutate({ id }).catch(trpcClientErrorHandler);
						ui.setToast({
							alertClasses: 'alert-success',
							title: 'Rule Duplicated Successfully'
						});
						await fetchRules();
					})
				}
			]
		});
</script>

{#if !rules || !filteredRules}
	<Loader title="Fetching Rules" overlay={false} />
{:else}
	<div class="container mx-auto">
		<div class="flex justify-between items-center">
			<h1 class="text-3xl font-bold flex items-end gap-2">
				Rules:
				<span class="font-normal font-mono text-2xl">({rules.length})</span>
			</h1>
			<div class="flex gap-2">
				<div class="tooltip" data-tip="Refresh">
					<IconBtn icon="mdi:refresh" iconClasses="text-primary" on:click={fetchRules} />
				</div>

				<label class="input input-sm input-bordered flex items-center gap-2">
					<input type="text" class="grow" placeholder="Search" bind:value={search} />
					{#if search}
						<button on:click={() => (search = '')}>
							<Icon icon="mdi:clear" width={20} class="text-error" />
						</button>
					{:else}
						<Icon icon="mdi:search" width={20} />
					{/if}
				</label>

				<!-- <button class="btn btn-sm btn-warning" on:click={async () => goto('/rules/rule-config')}>
					<Icon icon="mdi:filter" width={18} />
					Filter / Sort
				</button> -->

				<button class="btn btn-sm btn-success" on:click={async () => goto('/rules/rule-config')}>
					<Icon icon="mdi:add" width={18} />
					Create Rule
				</button>
			</div>
		</div>
		<div class="divider mt-1" />

		<div class="flex flex-col gap-4">
			{#each filteredRules as { id, isActive, name, description, createdAt, _count }}
				<div class="indicator w-full">
					<span class="indicator-item badge badge-sm {isActive ? 'badge-success' : 'badge-error'} mt-0.5 mr-0.5">
						{isActive ? 'Active' : 'Inactive'}
					</span>
					<button
						class="card border shadow px-4 py-2 flex flex-row justify-between items-center w-full"
						on:click={() => goto(`/rules/rule-config?id=${id}`)}
					>
						<div class="max-w-xs w-full text-left">
							<div class="text-lg font-semibold">{name}</div>
							<div class="tooltip tooltip-info tooltip-right" data-tip={description}>
								<div class="text-sm italic max-w-xs whitespace-nowrap text-ellipsis overflow-hidden">
									{description}
								</div>
							</div>
						</div>

						<div class="card text-center">
							<div class="text-lg font-semibold font-mono">{createdAt.toLocaleString()}</div>
							<div class="text-sm">Created On</div>
						</div>

						<div class="card text-center">
							<div class="text-lg font-semibold font-mono text-primary">{_count.affiliates}</div>
							<div class="text-sm">Affiliates</div>
						</div>

						<div class="card text-center">
							<div class="text-lg font-semibold font-mono text-accent">{_count.operators}</div>
							<div class="text-sm">Operators</div>
						</div>

						<div class="card text-center">
							<div class="text-lg font-semibold font-mono text-info">{_count.supervisors}</div>
							<div class="text-sm">Supervisors</div>
						</div>

						<div class="card text-center">
							<div class="text-lg font-semibold font-mono text-warning">{_count.queuedLeads}</div>
							<div class="text-sm">Queued Leads</div>
						</div>

						<div class="card text-center">
							<div class="text-lg font-semibold font-mono text-success">{_count.completedLeads}</div>
							<div class="text-sm">Completed Leads</div>
						</div>

						<div class="flex gap-4 items-center">
							<div class="tooltip" data-tip="Duplicate">
								<IconBtn
									icon="mdi:content-duplicate"
									iconClasses="text-info"
									on:click={(e) => {
										e.stopPropagation();
										showDuplicateAlert(id);
									}}
								/>
							</div>
							<IconBtn icon="mdi:chevron-right" width={24} />
						</div>
					</button>
				</div>
			{:else}
				<div class="text-center mt-10">No Rule Found</div>
			{/each}
		</div>
	</div>
{/if}
