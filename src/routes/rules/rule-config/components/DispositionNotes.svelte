<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import FormControl from '../../../components/FormControl.svelte';
	import { tick } from 'svelte';

	$: ({
		rule: { dispositionNotes }
	} = $ruleConfig);

	const addDispositionNote = () => {
		$ruleConfig.rule.dispositionNotes = [
			...dispositionNotes,
			{
				id: null,
				num: dispositionNotes.length + 1,
				notes: '',
				smsTemplate: '',
				requeueTime: 0
			}
		];
	};

	const sortDispositionNotes = () => {
		$ruleConfig.rule.dispositionNotes = dispositionNotes
			.sort((a, b) => a.num - b.num)
			.map((a, i) => ({ ...a, num: i + 1 }));
	};

	const deleteDispositionNote = async (num: number) => {
		$ruleConfig.rule.dispositionNotes = dispositionNotes.filter((a) => a.num !== num);
		await tick();
		sortDispositionNotes();
	};
</script>

<div class="flex gap-2 mb-4">
	<div class="text-lg font-semibold">Disposition Notes:</div>
	<button class="z-10 text-success" on:click={addDispositionNote}>
		<Icon icon="mdi:add-circle" width={24} />
	</button>
</div>

<div class="space-y-4 px-2 mb-2">
	{#each dispositionNotes as { num }, i}
		<div class="card border-2 p-4">
			<div class="flex justify-start items-center gap-2 mb-1">
				<button on:click={() => deleteDispositionNote(num)}>
					<Icon icon="mdi:close" class="text-error" width="20" />
				</button>
				<div class="font-semibold">Call Disposition {num}</div>
			</div>
			<div class="flex gap-6">
				<FormControl label="Notes" classes="flex-grow">
					<input
						type="text"
						placeholder="Type here"
						class="input input-sm input-bordered w-full join-item"
						bind:value={$ruleConfig.rule.dispositionNotes[i].notes}
					/>
				</FormControl>
				<FormControl label="SMS Template" classes="flex-grow">
					<input
						type="text"
						placeholder="Type here"
						class="input input-sm input-bordered w-full join-item"
						bind:value={$ruleConfig.rule.dispositionNotes[i].smsTemplate}
					/>
				</FormControl>
				<FormControl label="Requeue Time" classes="flex-grow">
					<div class="join">
						<input
							type="number"
							placeholder="Type here"
							class="input input-sm input-bordered w-full join-item"
							bind:value={$ruleConfig.rule.dispositionNotes[i].requeueTime}
						/>
						<div class="btn btn-sm join-item no-animation cursor-default">sec</div>
					</div>
				</FormControl>
			</div>
		</div>
	{:else}
		<div class="text-center">No Disposition Notes</div>
	{/each}
</div>
