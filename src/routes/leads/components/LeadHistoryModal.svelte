<script lang="ts">
	import type { LdLeadHistory } from '@prisma/client';
	import Modal from '../../components/Modal.svelte';

	export let viewHistory: LdLeadHistory[] | undefined;
</script>

{#if viewHistory}
	<Modal title="Lead History" showModal={viewHistory !== undefined} closeModal={() => (viewHistory = undefined)}>
		<div class="overflow-x-auto">
			<div class="table table-zebra border rounded-none">
				<thead class="bg-base-200">
					<tr>
						<th>Status</th>
						<th>Date Time</th>
					</tr>
				</thead>
				<tbody>
					{#each viewHistory as { createdAt, status }}
						<tr>
							<td>{status}</td>
							<td>{createdAt.toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</div>
		</div>
	</Modal>
{/if}
