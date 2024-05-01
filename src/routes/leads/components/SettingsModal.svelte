<script lang="ts">
	import { trpc } from '../../../trpc/client';
	import { page } from '$app/stores';
	import { auth } from '../../../stores/auth.store';
	import type { inferRouterOutputs } from '@trpc/server';
	import type { AppRouter } from '../../../trpc/routers/app.router';
	import FormControl from '../../components/FormControl.svelte';
	import cloneDeep from 'lodash.clonedeep';
	import { ui } from '../../../stores/ui.store';
	import { trpcClientErrorHandler } from '../../../trpc/trpcErrorhandler';
	import Modal from '../../components/ui/Modal.svelte';
	import Loader from '../../components/ui/Loader.svelte';
	import { onMount } from 'svelte';

	type Rule = inferRouterOutputs<AppRouter>['rule']['getForSettings']['rules'][number];

	$: ({
		user: { UserKey },
		roleType
	} = $auth);
	let ogRules: Rule[] | undefined;
	let rules: Rule[] | undefined;

	const fetchRules = async () => {
		rules = undefined;
		ogRules = (await trpc($page).rule.getForSettings.query({ UserKey, roleType }).catch(trpcClientErrorHandler)).rules;
		rules = cloneDeep(ogRules);
	};

	onMount(fetchRules);

	const isRuleChanged = (id: string) =>
		JSON.stringify(ogRules?.find((r) => r.id === id)) !== JSON.stringify(rules?.find((r) => r.id === id));

	const discardChanges = (i: number) => {
		if (rules && ogRules) rules[i] = cloneDeep(ogRules[i]);
	};

	const saveChanges = async (i: number) => {
		if (!rules || !ogRules) return;
		ui.setLoader({ title: 'Saving Changes' });
		await trpc($page)
			.rule.updateOperators.mutate({ ruleId: rules[i].id, operators: rules[i].operators })
			.catch(trpcClientErrorHandler);
		await fetchRules();
		ui.setLoader();
	};
</script>

<Modal title="Settings" boxClasses="max-w-2xl z-0" classes="z-0">
	{#if !rules}
		<div class="my-10">
			<Loader size={60} overlay={false} fixed={false} />
		</div>
	{:else}
		<div class="mb-2">
			<span class="font-semibold text-lg">Rules: </span>
			<span class="font-mono">({rules.length})</span>
		</div>

		{#each rules as { id, name, operators }, ri}
			<details class="collapse collapse-arrow border shadow my-3">
				<summary class="collapse-title bg-base-200">{name}</summary>
				<div class="collapse-content pt-4">
					<div>
						<span class="font-semibold">Campaign Operators:</span>
						<span class="font-mono">({operators.length})</span>
					</div>

					<div class="space-y-2 px-1 my-4">
						{#each operators as { user: { VonageAgentId, FirstName, LastName, Email } }, oi}
							<div class="px-1">
								<div class="flex justify-between items-center gap-2">
									<div class="flex-grow">
										<div>
											<span class="font-mono">{VonageAgentId}:</span>
											<span class="font-semibold">{FirstName} {LastName}</span>
											<span class="italic"> - {Email}</span>
										</div>

										<div class="grid grid-cols-2">
											<FormControl inputType="In" label="Assign New Leads">
												<input
													type="checkbox"
													class="checkbox checkbox-sm checkbox-primary"
													bind:checked={rules[ri].operators[oi].assignNewLeads}
												/>
											</FormControl>
											<FormControl inputType="In" label="Assign Callback Leads">
												<input
													type="checkbox"
													class="checkbox checkbox-sm checkbox-primary"
													bind:checked={rules[ri].operators[oi].assignCallbackLeads}
												/>
											</FormControl>
										</div>
									</div>
								</div>
							</div>
							<div class="divider m-0" />
						{:else}
							<div class="text-center absolute inset-0 top-1/2">No Operators</div>
							<div class="py-4" />
						{/each}
					</div>

					<div class="flex join">
						<button
							class="btn btn-sm btn-error {!isRuleChanged(id) && 'btn-disabled'} w-1/2 join-item"
							on:click={() => discardChanges(ri)}
						>
							Discard
						</button>
						<button
							class="btn btn-sm btn-success {!isRuleChanged(id) && 'btn-disabled'} w-1/2 join-item"
							on:click={() => saveChanges(ri)}
						>
							Save
						</button>
					</div>
				</div>
			</details>
		{/each}
	{/if}
</Modal>
