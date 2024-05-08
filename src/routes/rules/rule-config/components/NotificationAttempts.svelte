<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleChanges, ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import Variables from './Variables.svelte';
	import { nanoid } from 'nanoid';
	import { tick } from 'svelte';
	import DurationPicker from '../../../components/DurationPicker.svelte';
	import IconBtn from '../../../components/ui/IconBtn.svelte';
	import { notificationTypes } from '$lib/data/notificationTypes';
	import { notificationTargets } from '$lib/data/notificationTargets';

	$: ({
		rule: { notificationAttempts }
	} = $ruleConfig);

	const addNotificationAttempt = () =>
		($ruleConfig.rule.notificationAttempts = [
			...notificationAttempts,
			{
				id: nanoid(),
				num: notificationAttempts.length + 1,
				type: 'push',
				target: 'one',
				messageTemplate: '',
				waitTime: 0
			}
		]);

	const moveNotificationAttempt = (i: number, dir: 'up' | 'down') => {
		const temp = notificationAttempts[i];

		if (dir === 'up') {
			notificationAttempts[i] = { ...notificationAttempts[i - 1], num: i + 1 };
			notificationAttempts[i - 1] = { ...temp, num: i };
		} else if (dir === 'down') {
			notificationAttempts[i] = { ...notificationAttempts[i + 1], num: i + 1 };
			notificationAttempts[i + 1] = { ...temp, num: i + 2 };
		}
		$ruleConfig.rule.notificationAttempts = notificationAttempts;
	};

	const sortNotificationAttempts = () =>
		($ruleConfig.rule.notificationAttempts = notificationAttempts
			.sort((a, b) => a.num - b.num)
			.map((a, i) => ({ ...a, num: i + 1 })));

	const deleteNotificationAttempt = async (num: number) => {
		$ruleConfig.rule.notificationAttempts = notificationAttempts.filter((a) => a.num !== num);
		await tick();
		sortNotificationAttempts();
	};

	$: notificationAttemptChanges = {
		create: $ruleChanges.notificationAttempts?.create?.map(({ id }) => id) ?? [],
		update: $ruleChanges.notificationAttempts?.update?.map(({ id }) => id) ?? [],
		remove: $ruleChanges.notificationAttempts?.remove?.map(({ id }) => id) ?? []
	};
</script>

<details class="collapse collapse-arrow overflow-visible">
	<summary class="collapse-title px-0">
		<div class="flex flex-wrap items-center gap-2">
			<div>
				<span class="text-lg font-bold">Notification Attempts:</span>
				<span class="font-mono">({notificationAttempts.length})</span>
			</div>

			<IconBtn icon="mdi:add-circle" width={24} iconClasses="text-success" on:click={addNotificationAttempt} />

			{#if notificationAttemptChanges.create.length}
				<div class="badge badge-success">Added: {notificationAttemptChanges.create.length}</div>
			{/if}
			{#if notificationAttemptChanges.update.length}
				<div class="badge badge-warning">Modified: {notificationAttemptChanges.update.length}</div>
			{/if}
			{#if notificationAttemptChanges.remove.length}
				<div class="badge badge-error">Removed: {notificationAttemptChanges.remove.length}</div>
			{/if}
		</div>
	</summary>
	<div class="collapse-content p-0">
		<div class="space-y-4 px-2">
			{#each notificationAttempts as { id, num }, i}
				<div
					class="my-card {notificationAttemptChanges.create.includes(id) && 'outline outline-success'} 
               {notificationAttemptChanges.update.includes(id) && 'outline outline-warning'}"
				>
					<div class="flex justify-between">
						<div class="flex items-center gap-1 mb-1">
							<IconBtn
								icon="mdi:close"
								iconClasses="text-error"
								width={20}
								on:click={() => deleteNotificationAttempt(num)}
							/>
							<div class="font-semibold">Attempt #{num}</div>
						</div>

						<div>
							{#if i !== 0}
								<button class="btn btn-xs" on:click={() => moveNotificationAttempt(i, 'up')}>
									<Icon icon="mdi:arrow-up-thick" class="text-info" width="20" />
								</button>
							{/if}
							{#if i !== notificationAttempts.length - 1}
								<button class="btn btn-xs ml-2" on:click={() => moveNotificationAttempt(i, 'down')}>
									<Icon icon="mdi:arrow-down-thick" class="text-info" width="20" />
								</button>
							{/if}
						</div>
					</div>
					<div class="divider m-0" />

					<div class="grid grid-cols-2 mt-1">
						<div>
							<div class="font-semibold mt-1">Notification Type</div>
							<div class="flex gap-4">
								{#each Object.entries(notificationTypes) as [key, value]}
									<FormControl inputType="In" label={value}>
										<input
											type="radio"
											name="Attempt {num} Type"
											class="radio radio-sm radio-primary"
											value={key}
											bind:group={$ruleConfig.rule.notificationAttempts[i].type}
										/>
									</FormControl>
								{/each}
							</div>
						</div>

						<div>
							<div class="font-semibold mt-1">Notification Target</div>
							<div class="flex gap-4">
								{#each Object.entries(notificationTargets('Operator')) as [key, value]}
									<FormControl inputType="In" label={value}>
										<input
											type="radio"
											name="Attempt {num} Target"
											class="radio radio-sm radio-primary"
											value={key}
											bind:group={$ruleConfig.rule.notificationAttempts[i].target}
										/>
									</FormControl>
								{/each}
							</div>
						</div>
					</div>

					<div class="flex gap-6">
						<FormControl
							label="Notification Message Template"
							classes="w-full"
							bottomLabel={'Max 190 Characters (After Variables Replaced)'}
						>
							<div class="join">
								<textarea
									placeholder="Type here"
									class="textarea textarea-sm textarea-bordered w-full join-item"
									bind:value={$ruleConfig.rule.notificationAttempts[i].messageTemplate}
									rows={1}
								/>
								<Variables
									variables={['LeadStatus']}
									insertVariable={(v) => ($ruleConfig.rule.notificationAttempts[i].messageTemplate += v)}
								/>
							</div>
						</FormControl>

						<FormControl label="Wait Time">
							<DurationPicker bind:duration={$ruleConfig.rule.notificationAttempts[i].waitTime} />
						</FormControl>
					</div>
				</div>
			{:else}
				<div class="text-center">No Notification Attempts</div>
			{/each}
		</div>
	</div>
</details>
