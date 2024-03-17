<script lang="ts">
	import Icon from '@iconify/svelte';
	import DurationPicker from '../../../../routes/components/DurationPicker.svelte';
	import { onMount } from 'svelte';
	import type { ScheduleCallback } from './scheduleCallback.schema';
	import FormControl from '../../../../routes/components/FormControl.svelte';

	export let action: ScheduleCallback;
	export let actionsCount: number;
	export let deleteAction: (id: string) => void;
	export let moveAction: (num: number, dir: 'up' | 'down') => void;

	let scheduleTimes: number[] | undefined;
	onMount(() => (scheduleTimes = action.scheduleTimes.split('|').map((st) => Number(st))));
	$: scheduleTimes && (action.scheduleTimes = scheduleTimes.join('|'));
	const addScheduleTime = () => scheduleTimes && (scheduleTimes = [...scheduleTimes, 0]);
	const deleteScheduleTime = (index: number) =>
		scheduleTimes && (scheduleTimes = scheduleTimes.filter((_, i) => i !== index));
</script>

{#if scheduleTimes}
	<li class="step step-primary">
		<div class="flex flex-col w-full my-card my-2">
			<div class="flex justify-between">
				<div class="flex items-center">
					<button class="btn btn-xs btn-square btn-ghost mr-1" on:click={() => deleteAction(action.id)}>
						<Icon icon="mdi:close" class="text-error" width={20} />
					</button>
					<div class="font-semibold">Schedule Callback</div>
				</div>
				<div>
					{#if action.num !== 1}
						<button class="btn btn-xs" on:click={() => moveAction(action.num, 'up')}>
							<Icon icon="mdi:arrow-up-thick" class="text-info" width="20" />
						</button>
					{/if}
					{#if action.num !== actionsCount}
						<button class="btn btn-xs ml-2" on:click={() => moveAction(action.num, 'down')}>
							<Icon icon="mdi:arrow-down-thick" class="text-info" width="20" />
						</button>
					{/if}
				</div>
			</div>
			<div class="divider m-0" />

			<div class="flex gap-2 my-2">
				<div>
					<span class="font-semibold">Schedule Times:</span>
					<span class="font-mono">({scheduleTimes.length})</span>
				</div>
				<button class="z-10 text-success" on:click={addScheduleTime}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>

			<ul class="steps steps-vertical mb-4">
				{#each scheduleTimes as _, i}
					<li class="step step-info">
						<div class="flex items-center gap-2">
							<DurationPicker bind:duration={scheduleTimes[i]} />
							{#if scheduleTimes.length !== 1}
								<button class="btn btn-sm btn-square btn-ghost" on:click={() => deleteScheduleTime(i)}>
									<Icon icon="mdi:close" class="text-error" width={22} />
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<FormControl inputType="In" label="Send SMS before callback" labelClasses="font-semibold">
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={action.sendSMS} />
			</FormControl>
			<div class="flex items-start gap-4">
				<FormControl label="SMS Template" classes="w-full">
					<textarea
						class="textarea textarea-bordered"
						rows={1}
						bind:value={action.smsTemplate}
						disabled={!action.sendSMS}
					/>
				</FormControl>
				<FormControl label="Wait Time">
					<DurationPicker bind:duration={action.smsWaitTime} disabled={!action.sendSMS} />
				</FormControl>
			</div>
		</div>
	</li>
{/if}
