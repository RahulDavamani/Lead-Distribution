<script lang="ts">
	import Modal from '../../../components/Modal.svelte';
	import { type ActionKey, actionsConfigList, actionsConfig, keyActionsList } from '$lib/config/actions.config';
	import type { Actions } from '$lib/config/actions.schema';
	import RequeueLead from '$lib/config/requeueLead/RequeueLead.svelte';
	import SendSMS from '$lib/config/sendSMS/SendSMS.svelte';
	import CloseLead from '$lib/config/closeLead/CloseLead.svelte';
	import CompleteLead from '$lib/config/completeLead/CompleteLead.svelte';
	import { getActionsList } from '$lib/config/utils/getActionsList';

	export let actions: Actions;
	export let actionsName: string;
	let showAddAction = false;
	$: ({ actionsCount, actionsList } = getActionsList(actions));

	const addAction = (key: ActionKey) => {
		const keyActions = `${key}Actions` as `${ActionKey}Actions`;
		const newAction = actionsConfig[key].client.getNewAction(actionsCount + 1);
		actions = { ...actions, [keyActions]: [...actions[keyActions], newAction] };
		showAddAction = false;
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

<details class="collapse collapse-arrow border shadow-sm overflow-visible">
	<summary class="collapse-title bg-base-200 rounded-box h-1">
		<div>
			<span class="font-semibold">{actionsName}:</span>
			<span class="font-mono">({actionsCount})</span>
		</div>
	</summary>

	<div class="collapse-content p-0 py-4">
		<ul class="steps steps-vertical px-4 w-full overflow-visible">
			{#each actionsList as actions}
				{#if actions.requeueLead}
					<RequeueLead action={actions.requeueLead} {deleteAction} />
				{:else if actions.sendSMS}
					<SendSMS action={actions.sendSMS} {deleteAction} />
				{:else if actions.closeLead}
					<CloseLead action={actions.closeLead} {deleteAction} />
				{:else if actions.completeLead}
					<CompleteLead action={actions.completeLead} {deleteAction} />
				{/if}
			{/each}
			<li data-content="+" class="step step-success">
				<button class="btn btn-sm btn-success w-full" on:click={() => (showAddAction = true)}> Add Action </button>
			</li>
		</ul>
	</div>
</details>

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
