<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import { onMount } from 'svelte';
	import SelectSupervisor from './SelectSupervisor.svelte';

	$: ({
		rule: { notification }
	} = $ruleConfig);

	let escalateToSupervisor = false;
	let showSupervisorSelect = false;
	onMount(() => {
		escalateToSupervisor = $ruleConfig.rule.notification?.supervisorUserId !== null;
	});

	$: if ($ruleConfig.rule.notification && $ruleConfig.rule.notification.supervisorUserId === null)
		$ruleConfig.rule.notification.supervisorTextTemplate = '';
	$: supervisor = $ruleConfig.operators.find(
		({ UserId }) => UserId === $ruleConfig.rule.notification?.supervisorUserId && UserId
	);

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
					id: null,
					notificationType: 'one',
					notificationAttempts: [],
					supervisorUserId: null,
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
			<div class="font-semibold">Operation Notification Wait Time:</div>
			<button class="z-10 text-success" on:click={addNotificationAttempt}>
				<Icon icon="mdi:add-circle" width={24} />
			</button>
		</div>

		<div class="space-y-4 px-2 mb-2">
			{#each notification.notificationAttempts as { num }, i}
				<div class="card border-2 p-4">
					<div class="flex justify-start items-center gap-2 mb-1">
						<button on:click={() => deleteNotificationAttempt(num)}>
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

		<div class="flex justify-end">
			<div class="alert w-1/3 px-2 py-1 text-xs">
				<span class="font-semibold">Dynamic Variables:</span>
				%CustomerFirstName, %CustomerLastName, %Email, %Address, %ZipCode
			</div>
		</div>

		<FormControl
			inputType="In"
			label="Escalate to Supervisor"
			labelClasses="font-semibold"
			secLabel="(if no pick from Operator)"
		>
			<input type="checkbox" class="checkbox" bind:checked={escalateToSupervisor} />
		</FormControl>

		{#if escalateToSupervisor}
			<div class="flex mt-2">
				<FormControl classes="w-full px-2" label="Supervisor">
					<button
						class="input input-bordered input-sm cursor-pointer text-left"
						on:click={() => (showSupervisorSelect = true)}
					>
						{#if supervisor}
							<span class="font-mono">{$ruleConfig.rule.notification.supervisorUserId}:</span>
							<span class="font-semibold">{supervisor.Name}</span>
							<span class="italic"> - {supervisor.Email}</span>
						{:else}
							<span class="opacity-80">Select here</span>
						{/if}
					</button>
				</FormControl>
				<FormControl classes="w-full px-2" label="Supervisor Text Template">
					<input
						type="text"
						placeholder="Type here"
						class="input input-bordered input-sm"
						bind:value={$ruleConfig.rule.notification.supervisorTextTemplate}
					/>
				</FormControl>
			</div>
		{/if}
	</div>
{/if}

<SelectSupervisor bind:showModal={showSupervisorSelect} />
