<script lang="ts">
	import { ruleChanges, ruleConfig } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import IconBtn from '../../../components/ui/IconBtn.svelte';
	import { ui } from '../../../../stores/ui.store';

	$: ({
		rule: { operators },
		masterData
	} = $ruleConfig);

	const sortOperators = () =>
		($ruleConfig.rule.operators = operators.sort((a, b) => a.num - b.num).map((op, i) => ({ ...op, num: i })));

	const deleteOperator = async (UserKey: string) => {
		$ruleConfig.rule.operators = operators.filter((op) => op.UserKey !== UserKey);
		await tick();
		sortOperators();
	};

	$: operatorChanges = {
		create: $ruleChanges.operators?.create?.map(({ id }) => id) ?? [],
		update: $ruleChanges.operators?.update?.map(({ id }) => id) ?? [],
		remove: $ruleChanges.operators?.remove?.map(({ id }) => id) ?? []
	};
</script>

<div class="w-full h-fit">
	<details class="collapse collapse-arrow">
		<summary class="collapse-title px-0">
			<div class="flex flex-wrap items-center gap-2">
				<div>
					<span class="text-lg font-bold">Campaign Operators:</span>
					<span class="font-mono">({operators.length})</span>
				</div>

				<IconBtn
					icon="mdi:add-circle"
					width={24}
					iconClasses="text-success"
					on:click={() => ui.setModals({ addOperator: true })}
				/>

				{#if operatorChanges.create.length}
					<div class="badge badge-success">Added: {operatorChanges.create.length}</div>
				{/if}
				{#if operatorChanges.update.length}
					<div class="badge badge-warning">Modified: {operatorChanges.update.length}</div>
				{/if}
				{#if operatorChanges.remove.length}
					<div class="badge badge-error">Removed: {operatorChanges.remove.length}</div>
				{/if}
			</div>
		</summary>

		<div class="collapse-content pl-2 max-h-[30rem] overflow-auto">
			<div class="space-y-3 mt-1">
				{#each operators as { id, UserKey }, i}
					{@const operator = masterData.operators.find((o) => o.UserKey === UserKey)}

					<div
						class="my-card {operatorChanges.create.includes(id) && 'outline outline-success'} 
                     {operatorChanges.update.includes(id) && 'outline outline-warning'}"
					>
						<div class="flex justify-start items-center gap-1">
							<IconBtn icon="mdi:close" iconClasses="text-error" width={20} on:click={() => deleteOperator(UserKey)} />

							<div>
								{#if operator}
									{@const { VonageAgentId, FirstName, LastName, Email } = operator}
									<span class="font-mono">{VonageAgentId}:</span>
									<span class="font-semibold">{FirstName} {LastName}</span>
									<span class="italic"> - {Email}</span>
								{:else}
									<span>Invalid Operator</span>
								{/if}
							</div>
						</div>
						<div class="divider m-0" />

						<div class="text-sm flex flex-wrap">
							<FormControl inputType="In" classes="flex-grow" label="Assign New Leads">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-primary scale-90"
									bind:checked={$ruleConfig.rule.operators[i].assignNewLeads}
								/>
							</FormControl>
							<FormControl inputType="In" classes="flex-grow" label="Assign Callback Leads">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-primary scale-90"
									bind:checked={$ruleConfig.rule.operators[i].assignCallbackLeads}
								/>
							</FormControl>
						</div>
					</div>
				{:else}
					<div class="text-center mt-4">No Operators</div>
				{/each}
			</div>
		</div>
	</details>
</div>
