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
	$: ({ rule, operators } = $ruleConfig);

	let selectedSupervisors: number[] = [];
	$: addedSupervisors = rule.supervisors.map(({ UserId }) => UserId);

	const selectSupervisor = (id: number) => {
		if (addedSupervisors.includes(id)) return;
		if (selectedSupervisors.includes(id)) selectedSupervisors = selectedSupervisors.filter((o) => o !== id);
		else selectedSupervisors = [...selectedSupervisors, id];
	};

	const addSupervisors = () => {
		$ruleConfig.rule.supervisors = [
			...$ruleConfig.rule.supervisors,
			...selectedSupervisors.map((UserId) => ({
				id: nanoid(),
				UserId,
				textTemplate: '',
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
				{#each operators as { UserId, Name, Email }}
					<tr
						class="hover {!addedSupervisors.includes(UserId) && 'cursor-pointer'}"
						on:click={() => selectSupervisor(UserId)}
					>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedSupervisors.includes(UserId)}
								disabled={addedSupervisors.includes(UserId)}
							/>
						</td>
						<td>{UserId}</td>
						<td>{Name}</td>
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
