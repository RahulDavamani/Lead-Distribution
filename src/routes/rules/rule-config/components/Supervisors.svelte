<script lang="ts">
	import { ruleChanges, ruleConfig } from '../../../../stores/ruleConfig.store';
	import { tick } from 'svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import { ui } from '../../../../stores/ui.store';
	import IconBtn from '../../../components/ui/IconBtn.svelte';

	$: ({
		rule: { supervisors },
		masterData
	} = $ruleConfig);

	const sortSupervisors = () =>
		($ruleConfig.rule.supervisors = supervisors.sort((a, b) => a.num - b.num).map((op, i) => ({ ...op, num: i })));

	const deleteSupervisor = async (UserKey: string) => {
		$ruleConfig.rule.supervisors = supervisors.filter((op) => op.UserKey !== UserKey);
		await tick();
		sortSupervisors();
	};

	$: supervisorChanges = {
		create: $ruleChanges.supervisors?.create?.map(({ id }) => id) ?? [],
		update: $ruleChanges.supervisors?.update?.map(({ id }) => id) ?? [],
		remove: $ruleChanges.supervisors?.remove?.map(({ id }) => id) ?? []
	};
</script>

<div class="w-full h-fit pl-4">
	<details class="collapse collapse-arrow">
		<summary class="collapse-title px-0">
			<div class="flex flex-wrap items-center gap-2">
				<div>
					<span class="text-lg font-bold">Supervisors:</span>
					<span class="font-mono">({supervisors.length})</span>
				</div>

				<IconBtn
					icon="mdi:add-circle"
					width={24}
					iconClasses="text-success"
					on:click={() => ui.setModals({ addSupervisor: true })}
				/>

				{#if supervisorChanges.create.length}
					<div class="badge badge-success">Added: {supervisorChanges.create.length}</div>
				{/if}
				{#if supervisorChanges.update.length}
					<div class="badge badge-warning">Modified: {supervisorChanges.update.length}</div>
				{/if}
				{#if supervisorChanges.remove.length}
					<div class="badge badge-error">Removed: {supervisorChanges.remove.length}</div>
				{/if}
			</div>
		</summary>

		<div class="collapse-content pl-2 max-h-[30rem] overflow-auto">
			<div class="space-y-3 mt-1">
				{#each supervisors as { id, UserKey }, i}
					{@const supervisor = masterData.operators.find((o) => o.UserKey === UserKey)}

					<div
						class="my-card {supervisorChanges.create.includes(id) && 'outline outline-success'} 
                     {supervisorChanges.update.includes(id) && 'outline outline-warning'}"
					>
						<div class="flex justify-start items-center gap-1">
							<IconBtn
								icon="mdi:close"
								iconClasses="text-error"
								width={20}
								on:click={() => deleteSupervisor(UserKey)}
							/>

							<div>
								{#if supervisor}
									{@const { VonageAgentId, FirstName, LastName, Email } = supervisor}
									<span class="font-mono">{VonageAgentId}:</span>
									<span class="font-semibold">{FirstName} {LastName}</span>
									<span class="italic"> - {Email}</span>
								{:else}
									<span>Invalid Supervisor</span>
								{/if}
							</div>
						</div>
						<div class="divider m-0" />

						<div class="text-sm flex flex-wrap">
							<FormControl inputType="In" classes="flex-grow" label="Send Escalation Message">
								<input
									type="checkbox"
									class="toggle toggle-sm toggle-primary scale-90"
									bind:checked={$ruleConfig.rule.supervisors[i].isEscalate}
								/>
							</FormControl>
							<FormControl inputType="In" classes="flex-grow" label="Can Requeue">
								<input
									type="checkbox"
									class="toggle toggle-sm toggle-primary scale-90"
									bind:checked={$ruleConfig.rule.supervisors[i].isRequeue}
								/>
							</FormControl>
						</div>
					</div>
				{:else}
					<div class="text-center mt-4">No Supervisors</div>
				{/each}
			</div>
		</div>
	</details>
</div>
