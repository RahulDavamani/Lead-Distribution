<script lang="ts">
	import Icon from '@iconify/svelte';

	let waitForReply = true;
	let notification = true;

	let campaignOperators: string[] = ['', '', ''];
	let notificationAttempts: string[] = [];
</script>

<div class="font-bold text-2xl text-center mt-10">Distribution Rule</div>

<div class="container mx-auto mb-10">
	<div class="form-control w-full">
		<div class="label font-semibold">Rule Name</div>
		<input type="text" placeholder="Type here" class="input input-bordered" />
	</div>
	<div class="form-control w-full">
		<div class="label font-semibold">Description</div>
		<textarea placeholder="Type here" class="textarea textarea-bordered" />
	</div>
	<div class="divider" />

	<div class="text-lg font-semibold mb-2">Campaign Operators:</div>

	<div class="px-2">
		{#each campaignOperators as _, i}
			<div class="form-control">
				<label class="label cursor-pointer justify-start gap-4">
					<input type="checkbox" class="checkbox" />
					<span class="font-semibold">Operator {i + 1}</span>
				</label>
			</div>
		{:else}
			<div class="text-center">No Operators</div>
		{/each}
	</div>
	<div class="divider" />

	<div class="text-lg font-semibold mb-2">New Contact to GHL</div>
	<div class="form-control w-full">
		<div class="label font-semibold">New Contact Status</div>
		<div class="join">
			<select placeholder="Type here" class="select select-bordered w-full join-item">
				<option>Created</option>
			</select>
			<div class="btn btn-primary join-item">JSON from Text</div>
		</div>
	</div>
	<div class="divider" />

	<div class="form-control flex flex-row items-center">
		<label class="label cursor-pointer justify-start gap-4">
			<input type="checkbox" class="checkbox" bind:checked={waitForReply} />
			<span class="font-semibold">Wait time for the Customer Text Response</span>
		</label>
		{#if waitForReply}
			<div class="join w-full">
				<input type="number" placeholder="Type here" class="input input-bordered w-full join-item" />
				<div class="btn join-item no-animation cursor-default">sec</div>
			</div>
		{/if}
	</div>
	<div class="divider" />

	<div class="form-control mb-2">
		<label class="label cursor-pointer justify-start gap-4">
			<input type="checkbox" class="checkbox" bind:checked={notification} />
			<span class="font-semibold">Notification</span> (if no reply from Customer)
		</label>
	</div>

	{#if notification}
		<div class="px-4">
			<div class="label font-semibold">Send Notification to Operators</div>
			<div class="px-2 mb-4">
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input type="radio" name="abc" class="radio checked:bg-red-500" checked />
						<span>Send one by one (round-robin)</span>
					</label>
				</div>
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input type="radio" name="abc" class="radio checked:bg-red-500" checked />
						<span>Send to All</span>
					</label>
				</div>
			</div>

			<div class="flex items-start gap-2 mb-2">
				<div class="font-semibold">Operation Notification Wait Time:</div>
				<button class="z-10 text-success" on:click={() => (notificationAttempts = [...notificationAttempts, ''])}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>
			<div class="space-y-2 px-2 mb-2">
				{#each notificationAttempts as _, i}
					<div class="form-control">
						<div class="label font-semibold">Attempt {i + 1}</div>
						<div class="join">
							<input
								type="number"
								placeholder="Type here"
								class="input input-sm input-bordered w-full join-item"
								bind:value={notificationAttempts[i]}
							/>
							<div class="btn btn-sm join-item no-animation cursor-default">sec</div>
						</div>
					</div>
				{:else}
					<div class="text-center">No Attempts</div>
				{/each}
			</div>

			<div class="form-control">
				<label class="label cursor-pointer justify-start gap-4">
					<input type="checkbox" class="checkbox" />
					<span class="font-semibold">Escalate to Supervisor</span> (if no pick from Operator)
				</label>
			</div>
		</div>
	{/if}
</div>
