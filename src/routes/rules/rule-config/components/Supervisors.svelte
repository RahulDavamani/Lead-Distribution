<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import AddSupervisor from './AddSupervisor.svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import Variables from './Variables.svelte';

	let showModal = false;
	$: ({ rule, zodErrors, operators } = $ruleConfig);

	const deleteSupervisor = (id: number) =>
		($ruleConfig.rule.supervisors = rule.supervisors.filter((o) => o.UserId !== id));
</script>

<div class="flex justify-between items-center mb-4">
	<div class="flex gap-2">
		<div>
			<span class="text-lg font-semibold">Supervisors:</span>
			<span class="font-mono">({rule.supervisors.length})</span>
		</div>
		<button class="z-10 text-success" on:click={() => (showModal = true)}>
			<Icon icon="mdi:add-circle" width={24} />
		</button>
	</div>
</div>

<div class="space-y-4 px-2 mb-2">
	{#each rule.supervisors as { UserId }, i}
		{@const supervisor = operators.find((o) => o.UserId === UserId)}
		<div class="my-card">
			<div class="flex justify-start items-center gap-2 mb-1">
				<button on:click={() => deleteSupervisor(UserId)}>
					<Icon icon="mdi:close" class="text-error" width="20" />
				</button>
				<div>
					{#if supervisor}
						<span class="font-mono">{UserId}:</span>
						<span class="font-semibold">{supervisor.Name}</span>
						<span class="italic"> - {supervisor.Email}</span>
					{:else}
						<span>Invalid Supervisor</span>
					{/if}
				</div>
			</div>

			<FormControl
				label="Notification Message Template"
				bottomLabel={'Max 190 Characters (After Dynamic Variables Replaced)'}
				error={zodErrors?.supervisors?.[i]?.textTemplate}
			>
				<div class="join">
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered join-item w-full"
						bind:value={$ruleConfig.rule.supervisors[i].textTemplate}
						rows={1}
					/>
					<Variables
						variables={['NotificationType']}
						insertVariable={(v) => ($ruleConfig.rule.supervisors[i].textTemplate += v)}
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

<AddSupervisor bind:showModal />
