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

<div class="flex gap-2 mb-4">
	<div>
		<span class="text-lg font-semibold">Notification Attempts:</span>
		<span class="font-mono">({notificationAttempts.length})</span>
	</div>
	<button class="z-10 text-success" on:click={addNotificationAttempt}>
		<Icon icon="mdi:add-circle" width={24} />
	</button>
</div>

<div class="space-y-4 px-2 mb-4">
	{#each notificationAttempts as { num }, i}
		<div class="my-card">
			<div class="flex justify-start items-center gap-2 mb-1">
				<button on:click={() => deleteNotificationAttempt(num)}>
					<Icon icon="mdi:close" class="text-error" width="20" />
				</button>
				<div class="font-semibold">Attempt #{num}</div>
			</div>
			<div class="flex gap-10">
				<FormControl
					label="Notification Message Template"
					classes="w-full"
					bottomLabel={'Max 190 Characters (After Dynamic Variables Replaced)'}
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
