<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';

	$: ({
		rule: { notification }
	} = $ruleConfig);

	$: if ($ruleConfig.rule.notification && $ruleConfig.rule.notification.escalateToSupervisor === false)
		$ruleConfig.rule.notification.supervisorTextTemplate = '';

	const addNotificationAttempt = () => {
		if ($ruleConfig.rule.notification && notification)
			$ruleConfig.rule.notification.notificationAttempts = [
				...notification.notificationAttempts,
				{
					id: null,
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

	const deleteNotification = (num: number) => {
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
	labelClasses="font-semibold"
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
					id: null,
					notificationType: 'one',
					notificationAttempts: [],
					escalateToSupervisor: false,
					supervisorTextTemplate: ''
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
				/>
			</FormControl>

			<FormControl inputType="In" label="Send to All">
				<input
					type="radio"
					name="notificationType"
					value="all"
					class="radio radio-primary"
					bind:group={$ruleConfig.rule.notification.notificationType}
				/>
			</FormControl>
		</div>

		<div class="flex items-start gap-2 mb-4">
			<div class="font-semibold">Operation Notification Wait Time:</div>
			<button class="z-10 text-success" on:click={addNotificationAttempt}>
				<Icon icon="mdi:add-circle" width={24} />
			</button>
		</div>
		<div class="space-y-4 px-2 mb-6">
			{#each notification.notificationAttempts as { num }, i}
				<div class="card border-2 p-4">
					<div class="flex justify-start items-center gap-2 mb-1">
						<button on:click={() => deleteNotification(num)}>
							<Icon icon="mdi:close" class="text-error" width="20" />
						</button>
						<div class="font-semibold">Attempt {num}</div>
					</div>
					<div class="flex gap-10">
						<FormControl label="Text Template" classes="flex-grow">
							<input
								type="text"
								placeholder="Type here"
								class="input input-sm input-bordered w-full join-item"
								bind:value={$ruleConfig.rule.notification.notificationAttempts[i].textTemplate}
							/>
						</FormControl>
						<FormControl label="Wait Time" classes="flex-grow">
							<div class="join">
								<input
									type="number"
									placeholder="Type here"
									class="input input-sm input-bordered w-full join-item"
									bind:value={$ruleConfig.rule.notification.notificationAttempts[i].waitTime}
								/>
								<div class="btn btn-sm join-item no-animation cursor-default">sec</div>
							</div>
						</FormControl>
					</div>
				</div>
			{:else}
				<div class="text-center">No Attempts</div>
			{/each}
		</div>

		<FormControl
			inputType="In"
			label="Escalate to Supervisor"
			labelClasses="font-semibold"
			secLabel="(if no pick from Operator)"
		>
			<input type="checkbox" class="checkbox" bind:checked={$ruleConfig.rule.notification.escalateToSupervisor} />
		</FormControl>
		{#if notification.escalateToSupervisor}
			<FormControl label="Supervisor Text Template" classes="px-2">
				<input
					type="text"
					class="input input-bordered input-sm"
					bind:value={$ruleConfig.rule.notification.supervisorTextTemplate}
				/>
			</FormControl>
		{/if}
	</div>
{/if}
