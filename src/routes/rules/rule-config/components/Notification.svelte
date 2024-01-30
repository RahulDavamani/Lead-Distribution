<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import Variables from './Variables.svelte';
	import { timeToText } from '$lib/client/DateTime';
	import { nanoid } from 'nanoid';

	$: ({
		rule: { notification },
		zodErrors
	} = $ruleConfig);

	const addNotificationAttempt = () => {
		if ($ruleConfig.rule.notification && notification)
			$ruleConfig.rule.notification.notificationAttempts = [
				...notification.notificationAttempts,
				{
					id: nanoid(),
					num: notification.notificationAttempts.length + 1,
					textTemplate: '',
					waitTime: 0
				}
			];
	};

	const sortNotificationAttempts = () => {
		if ($ruleConfig.rule.notification && notification)
			$ruleConfig.rule.notification.notificationAttempts = notification.notificationAttempts
				.sort((a, b) => a.num - b.num)
				.map((a, i) => ({ ...a, num: i + 1 }));
	};

	const deleteNotificationAttempt = (num: number) => {
		if ($ruleConfig.rule.notification && notification)
			$ruleConfig.rule.notification.notificationAttempts = notification.notificationAttempts.filter(
				(a) => a.num !== num
			);

		sortNotificationAttempts();
	};
</script>

<FormControl
	inputType="In"
	label="Notification"
	labelClasses="font-semibold text-lg"
	secLabel="(if no reply from Customer)"
	secLabelClasses="text-sm"
>
	<input
		type="checkbox"
		class="checkbox"
		checked={notification !== null}
		on:click={() => {
			if (notification === null)
				$ruleConfig.rule.notification = {
					id: nanoid(),
					notificationType: 'one',
					notificationAttempts: []
				};
			else $ruleConfig.rule.notification = null;
		}}
	/>
</FormControl>

{#if $ruleConfig.rule.notification !== null && notification !== null}
	<div class="px-4">
		<div class="label font-semibold">Send Notification to Operators</div>
		<div class="px-2 mb-4">
			<FormControl inputType="In" label="Send one by one (round-robin)">
				<input
					type="radio"
					name="notificationType"
					value="one"
					class="radio radio-primary"
					bind:group={$ruleConfig.rule.notification.notificationType}
					disabled={true}
				/>
			</FormControl>

			<FormControl inputType="In" label="Send to All">
				<input
					type="radio"
					name="notificationType"
					value="all"
					class="radio radio-primary"
					bind:group={$ruleConfig.rule.notification.notificationType}
					disabled={true}
				/>
			</FormControl>
		</div>

		<div class="flex items-start gap-2 mb-4">
			<div>
				<span class="font-semibold">Operation Notification Attempts:</span>
				<span class="font-mono">({notification.notificationAttempts.length})</span>
			</div>
			<button class="z-10 text-success" on:click={addNotificationAttempt}>
				<Icon icon="mdi:add-circle" width={24} />
			</button>
		</div>

		<div class="space-y-4 px-2 mb-4">
			{#each notification.notificationAttempts as { num }, i}
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
							error={zodErrors?.notification?.notificationAttempts?.[i]?.textTemplate}
						>
							<div class="join">
								<textarea
									placeholder="Type here"
									class="textarea textarea-sm textarea-bordered w-full join-item"
									bind:value={$ruleConfig.rule.notification.notificationAttempts[i].textTemplate}
									rows={1}
								/>
								<Variables
									variables={['NotificationType']}
									insertVariable={(v) =>
										$ruleConfig.rule.notification &&
										($ruleConfig.rule.notification.notificationAttempts[i].textTemplate += v)}
								/>
							</div>
						</FormControl>
						<FormControl
							label="Wait Time"
							classes="max-w-xs w-full"
							bottomLabel={`Time: ${timeToText($ruleConfig.rule.notification.notificationAttempts[i].waitTime)}`}
							error={zodErrors?.notification?.notificationAttempts?.[i]?.waitTime}
						>
							<div class="join">
								<input
									type="number"
									placeholder="Type here"
									class="input input-bordered w-full join-item"
									bind:value={$ruleConfig.rule.notification.notificationAttempts[i].waitTime}
								/>
								<div class="btn join-item no-animation cursor-default">sec</div>
							</div>
						</FormControl>
					</div>
				</div>
			{:else}
				<div class="text-center">No Attempts</div>
			{/each}
		</div>
	</div>
{/if}
