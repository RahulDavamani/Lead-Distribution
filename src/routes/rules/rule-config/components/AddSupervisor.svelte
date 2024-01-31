<script lang="ts">
	import { afterUpdate } from 'svelte';
	import Modal from '../../../components/Modal.svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import { nanoid } from 'nanoid';

	afterUpdate(() => {
		new DataTable('#supervisorsTable');
	});

	export let showModal: boolean;
	$: ({
		rule: { supervisors },
		operators
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
		showModal = false;
		selectedSupervisors = [];
	};

	const closeModal = () => {
		showModal = false;
		selectedSupervisors = [];
	};
</script>

<Modal bind:showModal title="Add Supervisors" boxClasses="max-w-6xl" {closeModal}>
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
				{#each operators as { UserKey, VonageAgentId, FirstName, LastName, Email }}
					<tr
						class="hover {!addedSupervisors.includes(UserKey) && 'cursor-pointer'}"
						on:click={() => selectSupervisor(UserKey)}
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
