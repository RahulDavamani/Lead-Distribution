<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../../../routes/components/FormControl.svelte';
	import type { SendSMS } from './sendSMS.schema';
	import Variables from '../../../../routes/rules/rule-config/components/Variables.svelte';
	import DurationPicker from '../../../../routes/components/DurationPicker.svelte';
	import { onMount } from 'svelte';

	export let action: SendSMS;
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
					<div class="font-semibold">Send SMS</div>
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

			<FormControl classes="w-full" label="SMS Template">
				<div class="join">
					<textarea
						placeholder="Type here"
						class="textarea textarea-bordered w-full join-item"
						bind:value={action.smsTemplate}
						rows={1}
					/>
					<Variables insertVariable={(v) => (action.smsTemplate += v)} />
				</div>
			</FormControl>

			<div class="flex gap-2 mt-3 mb-2">
				<div>
					<span class="font-semibold">Schedule Times:</span>
					<span class="font-mono">({scheduleTimes.length})</span>
				</div>
				<button class="z-10 text-success" on:click={addScheduleTime}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>

			<ul class="steps steps-vertical">
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
		</div>
	</li>
{/if}
