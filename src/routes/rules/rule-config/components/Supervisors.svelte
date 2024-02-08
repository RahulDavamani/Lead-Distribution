<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddSupervisor from './AddSupervisor.svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import Variables from './Variables.svelte';
	import { tick } from 'svelte';

	let showModal = false;
	$: ({
		rule: { supervisors },
		zodErrors,
		operators
	} = $ruleConfig);

	const sortSupervisors = () =>
		($ruleConfig.rule.supervisors = supervisors.sort((a, b) => a.num - b.num).map((sp, i) => ({ ...sp, num: i })));

	const deleteSupervisor = async (UserKey: string) => {
		$ruleConfig.rule.supervisors = supervisors.filter((sp) => sp.UserKey !== UserKey);
		await tick();
		sortSupervisors();
	};
</script>

<details class="collapse collapse-arrow overflow-visible">
	<summary class="collapse-title px-0">
		<div class="flex gap-2">
			<div>
				<span class="text-lg font-semibold">Supervisors:</span>
				<span class="font-mono">({supervisors.length})</span>
			</div>
			<button class="z-10 text-success" on:click={() => (showModal = true)}>
				<Icon icon="mdi:add-circle" width={24} />
			</button>
		</div>
	</summary>
	<div class="collapse-content p-0">
		<div class="space-y-4 px-2">
			{#each supervisors as { UserKey }, i}
				{@const supervisor = operators.find((o) => o.UserKey === UserKey)}
				<div class="my-card">
					<div class="flex items-center mb-1">
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

					<FormControl
						label="Notification Message Template"
						bottomLabel={'Max 190 Characters (After Variables Replaced)'}
						error={zodErrors?.supervisors?.[i]?.messageTemplate}
					>
						<div class="join">
							<textarea
								placeholder="Type here"
								class="textarea textarea-bordered join-item w-full"
								bind:value={$ruleConfig.rule.supervisors[i].messageTemplate}
								rows={1}
							/>
							<Variables
								variables={['LeadStatus']}
								insertVariable={(v) => ($ruleConfig.rule.supervisors[i].messageTemplate += v)}
							/>
						</div>
					</FormControl>

					<div class="flex gap-4">
						<FormControl inputType="In" label="Escalate to Supervisor">
							<input
								type="checkbox"
								placeholder="Type here"
								class="toggle toggle-primary toggle-sm"
								bind:checked={$ruleConfig.rule.supervisors[i].isEscalate}
							/>
						</FormControl>

						<FormControl inputType="In" label="Can Requeue">
							<input
								type="checkbox"
								placeholder="Type here"
								class="toggle toggle-primary toggle-sm"
								bind:checked={$ruleConfig.rule.supervisors[i].isRequeue}
							/>
						</FormControl>
					</div>
				</div>
			{/each}
		</div>
	</div>
</details>

<AddSupervisor bind:showModal />
