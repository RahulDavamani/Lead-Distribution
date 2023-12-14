<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import Modal from '../../../components/Modal.svelte';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-dt/css/jquery.dataTables.min.css';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	afterUpdate(() => {
		new DataTable('#operatorsTable');
	});

	export let showModal: boolean;
	$: ({ operators } = $ruleConfig);

	let selectedSupervisor: number | undefined;
	onMount(() => (selectedSupervisor = $ruleConfig.rule.notification?.supervisorUserId ?? undefined));

	const addOperator = () => {
		if (!selectedSupervisor || !$ruleConfig.rule.notification) return;
		$ruleConfig.rule.notification.supervisorUserId = selectedSupervisor;
		showModal = false;
		selectedSupervisor = undefined;
	};

	const closeModal = () => {
		showModal = false;
		selectedSupervisor = undefined;
	};
</script>

<Modal bind:showModal title="Add Campaign Operator" boxClasses="max-w-6xl" {closeModal}>
	<div class="overflow-x-auto">
		<table id="operatorsTable" class="table table-zebra border">
			<thead class="bg-base-200">
				<tr>
					<th></th>
					<th>ID</th>
					<th>Name</th>
					<th>Email</th>
					<th>Phone Number</th>
				</tr>
			</thead>
			<tbody>
				{#each operators as { UserId, Name, Email, PhoneNumber }}
					<tr
						class="hover {selectedSupervisor !== UserId && 'cursor-pointer'}"
						on:click={() => (selectedSupervisor = UserId)}
					>
						<td class="text-center w-12">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-success"
								checked={selectedSupervisor === UserId}
							/>
						</td>
						<td>{UserId}</td>
						<td>{Name}</td>
						<td>{Email}</td>
						<td>{PhoneNumber}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex justify-end mt-4">
		<button class="btn btn-success" on:click={addOperator}> Select Supervisor </button>
	</div>
</Modal>
