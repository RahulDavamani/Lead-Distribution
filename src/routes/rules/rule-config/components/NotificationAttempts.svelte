<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import Variables from './Variables.svelte';
	import { timeToText } from '$lib/client/DateTime';
	import { nanoid } from 'nanoid';
	import { tick } from 'svelte';

	$: ({
		rule: { notificationAttempts },
		zodErrors
	} = $ruleConfig);

	const addNotificationAttempt = () =>
		($ruleConfig.rule.notificationAttempts = [
			...notificationAttempts,
			{
				id: nanoid(),
				num: notificationAttempts.length + 1,
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
</script>

<details class="collapse collapse-arrow overflow-visible">
	<summary class="collapse-title px-0">
		<div class="flex gap-2">
			<div>
				<span class="text-lg font-semibold">Notification Attempts:</span>
				<span class="font-mono">({notificationAttempts.length})</span>
			</div>
			<button class="z-10 text-success" on:click={addNotificationAttempt}>
				<Icon icon="mdi:add-circle" width={24} />
			</button>
		</div>
	</summary>
	<div class="collapse-content p-0">
		<div class="space-y-4 px-2">
			{#each notificationAttempts as { num }, i}
				<div class="my-card">
					<div class="flex justify-between">
						<div class="flex items-center mb-1">
							<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteNotificationAttempt(num)}>
								<Icon icon="mdi:close" class="text-error" width={20} />
							</button>
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
					<div class="flex gap-6">
						<FormControl
							label="Notification Message Template"
							classes="w-full"
							bottomLabel={'Max 190 Characters (After Variables Replaced)'}
							error={zodErrors?.notificationAttempts?.[i]?.messageTemplate}
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
						<FormControl
							label="Wait Time"
							classes="max-w-xs w-full"
							bottomLabel={`Time: ${timeToText($ruleConfig.rule.notificationAttempts[i].waitTime)}`}
							error={zodErrors?.notificationAttempts?.[i]?.waitTime}
						>
							<div class="join">
								<input
									type="number"
									placeholder="Type here"
									class="input input-bordered w-full join-item"
									bind:value={$ruleConfig.rule.notificationAttempts[i].waitTime}
								/>
								<div class="btn join-item no-animation cursor-default">sec</div>
							</div>
						</FormControl>
					</div>
				</div>
			{/each}
		</div>
	</div>
</details>
