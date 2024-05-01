<script lang="ts">
	import { afterUpdate } from 'svelte';
	import DataTable from 'datatables.net-dt';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import { nanoid } from 'nanoid';
	import Modal from '../../../components/ui/Modal.svelte';
	import { ui } from '../../../../stores/ui.store';

	afterUpdate(() => new DataTable('#supervisorsTable'));

	$: ({
		rule: { supervisors },
		masterData
	} = $ruleConfig);

	let selectedSupervisors: string[] = [];
	$: addedSupervisors = supervisors.map(({ UserKey }) => UserKey);

	const selectSupervisor = (UserKey: string) => {
		if (addedSupervisors.includes(UserKey)) return;
		if (selectedSupervisors.includes(UserKey)) selectedSupervisors = selectedSupervisors.filter((o) => o !== UserKey);
		else selectedSupervisors = [...selectedSupervisors, UserKey];
	};

	const addSupervisors = () => {
		$ruleConfig.rule.supervisors = [
			...supervisors,
			...selectedSupervisors.map((UserKey, i) => ({
				id: nanoid(),
				num: supervisors.length + i + 1,
				UserKey,
				messageTemplate: '',
				isEscalate: true,
				isRequeue: true
			}))
		];
		selectedSupervisors = [];
		ui.setModals();
	};
</script>

<Modal title="Add Supervisors" boxClasses="max-w-6xl">
	<div class="overflow-x-auto">
		<table id="supervisorsTable" class="table table-zebra border rounded-t-none">
			<thead class="bg-base-300">
				<tr>
					<th></th>
					<th>ID</th>
					<th>Name</th>
					<th>Email</th>
				</tr>
			</thead>
			<tbody>
				{#each masterData.operators as { UserKey, VonageAgentId, FirstName, LastName, Email }}
					{#if UserKey}
						<tr
							class="hover {!addedSupervisors.includes(UserKey) && 'cursor-pointer'}"
							on:click={() => UserKey && selectSupervisor(UserKey)}
						>
							<td class="text-center w-12">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-success"
									checked={selectedSupervisors.includes(UserKey)}
									disabled={addedSupervisors.includes(UserKey)}
								/>
							</td>
							<td>{VonageAgentId}</td>
							<td>{FirstName} {LastName}</td>
							<td>{Email}</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex justify-end mt-4">
		<button class="btn btn-success" on:click={addSupervisors}>
			Add {selectedSupervisors.length} Supervisors
		</button>
	</div>
</Modal>
