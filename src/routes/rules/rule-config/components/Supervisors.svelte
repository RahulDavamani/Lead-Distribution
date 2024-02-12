<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddSupervisor from './AddSupervisor.svelte';
	import { tick } from 'svelte';
	import FormControl from '../../../components/FormControl.svelte';

	$: ({
		rule: { supervisors },
		operators: allOperators
	} = $ruleConfig);
	let showModal = false;

	const sortSupervisors = () =>
		($ruleConfig.rule.supervisors = supervisors.sort((a, b) => a.num - b.num).map((op, i) => ({ ...op, num: i })));

	const deleteSupervisor = async (UserKey: string) => {
		$ruleConfig.rule.supervisors = supervisors.filter((op) => op.UserKey !== UserKey);
		await tick();
		sortSupervisors();
	};
</script>

<div class="w-full h-fit pl-4">
	<details class="collapse collapse-arrow">
		<summary class="collapse-title px-0">
			<div class="flex gap-2">
				<div>
					<span class="text-lg font-bold">Supervisors:</span>
					<span class="font-mono">({supervisors.length})</span>
				</div>
				<button class="z-10 text-success" on:click={() => (showModal = true)}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>
		</summary>
		<div class="collapse-content pl-2">
			<div class="space-y-3">
				{#each supervisors as { UserKey }, i}
					{@const supervisor = allOperators.find((o) => o.UserKey === UserKey)}

					<div class="my-card">
						<div class="flex justify-start items-center">
							<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteSupervisor(UserKey)}>
								<Icon icon="mdi:close" class="text-error" width={20} />
							</button>

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
					<div class="text-center absolute inset-0 top-1/2">No Supervisors</div>
					<div class="py-4" />
				{/each}
			</div>
		</div>
	</details>
</div>

<AddSupervisor bind:showModal />
