<script lang="ts">
	import Modal from '../../../components/Modal.svelte';
	import { type ActionKey, actionsConfigList, actionsConfig, keyActionsList } from '$lib/config/actions/actions.config';
	import type { Actions } from '$lib/config/actions/actions.schema';
	import SendSMS from '$lib/config/actions/sendSMS/SendSMS.svelte';
	import CompleteLead from '$lib/config/actions/completeLead/CompleteLead.svelte';
	import { getActionsList } from '$lib/config/actions/utils/getActionsList';
	import ScheduleCallback from '$lib/config/actions/scheduleCallback/ScheduleCallback.svelte';

	export let actions: Actions;
	export let actionsName: string;

	let showAddAction = false;
	let collapseOpen = false;
	$: ({ actionsCount, actionsList } = getActionsList(actions));

	const addAction = (key: ActionKey) => {
		const keyActions = `${key}Actions` as `${ActionKey}Actions`;
		const newAction = actionsConfig[key].client.getNewAction(actionsCount + 1);
		actions = { ...actions, [keyActions]: [...actions[keyActions], newAction] };
		showAddAction = false;
	};

	const moveAction = (num: number, dir: 'up' | 'down') => {
		actionsConfigList.forEach(({ labels: { keyActions } }) => {
			actions[keyActions].forEach((a, i) => {
				if (dir === 'up') {
					if (a.num === num) actions[keyActions][i].num = num - 1;
					else if (a.num === num - 1) actions[keyActions][i].num = num;
				} else if (dir === 'down') {
					if (a.num === num) actions[keyActions][i].num = num + 1;
					else if (a.num === num + 1) actions[keyActions][i].num = num;
				}
			});
		});
	};

	const deleteAction = (id: string) => {
		let deletedNum = 0;
		for (const k of keyActionsList) {
			actions = {
				...actions,
				[k]: actions[k].filter((a) => {
					if (a.id === id) deletedNum = a.num;
					return a.id !== id;
				})
			};
		}
		for (const k of keyActionsList) {
			actions = {
				...actions,
				[k]: actions[k].map((a) => {
					if (a.num > deletedNum) a.num--;
					return a;
				})
			};
		}
	};
</script>

<div class="collapse collapse-arrow border shadow-sm overflow-visible">
	<input type="checkbox" bind:checked={collapseOpen} />
	<div class="collapse-title bg-base-200 rounded-box {!collapseOpen && actionsList.length !== 0 && 'py-0'}">
		<div class="flex gap-4 items-center">
			<div>
				<span class="font-semibold">{actionsName}:</span>
				<span class="font-mono">({actionsCount})</span>
			</div>

			{#if !collapseOpen}
				<div class="steps text-sm">
					{#each actionsList as action}
						<div class="step step-primary scale-90">
							{#if action.sendSMS}
								Send SMS
							{:else if action.scheduleCallback}
								Schedule Callback
							{:else if action.completeLead}
								Complete Lead
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="collapse-content">
		<ul class="steps steps-vertical mt-4 px-4 w-full overflow-visible">
			{#each actionsList as action}
				{#if action.sendSMS}
					<SendSMS action={action.sendSMS} {actionsCount} {deleteAction} {moveAction} />
				{:else if action.scheduleCallback}
					<ScheduleCallback action={action.scheduleCallback} {actionsCount} {deleteAction} {moveAction} />
				{:else if action.completeLead}
					<CompleteLead action={action.completeLead} {actionsCount} {deleteAction} {moveAction} />
				{/if}
			{/each}
			<li data-content="+" class="step step-success">
				<button class="btn btn-sm btn-success w-full" on:click={() => (showAddAction = true)}> Add Action </button>
			</li>
		</ul>
	</div>
</div>

{#if showAddAction}
	<Modal title="Add Action" showModal={showAddAction} closeModal={() => (showAddAction = false)}>
		<div class="flex flex-col gap-4">
			{#each actionsConfigList as { labels: { key, name } }}
				<button class="btn rounded-box text-xl justify-start items-center normal-case" on:click={() => addAction(key)}>
					{name}
				</button>
			{/each}
		</div>
	</Modal>
{/if}
