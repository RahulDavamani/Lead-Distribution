<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../components/FormControl.svelte';

	let waitForReply = true;
	let notification = true;

	let campaignOperators: string[] = ['', '', ''];
	let notificationAttempts: string[] = [];
</script>

<div class="font-bold text-2xl text-center mt-10">Distribution Rule</div>

<div class="container mx-auto mb-10">
	<FormControl label="Rule Name">
		<input type="text" placeholder="Type here" class="input input-bordered" />
	</FormControl>
	<FormControl label="Description">
		<textarea placeholder="Type here" class="textarea textarea-bordered" />
	</FormControl>
	<div class="divider" />

	<div class="flex gap-4">
		<div class="flex-grow card border p-4">
			<div class="text-lg font-semibold mb-2">Campaign Operators:</div>
			<div class="px-2">
				{#each campaignOperators as _, i}
					<FormControl inputType="In" label="Operator {i + 1}">
						<input type="checkbox" class="checkbox" />
					</FormControl>
				{:else}
					<div class="text-center">No Operators</div>
				{/each}
			</div>
		</div>
		<div class="flex-grow card border p-4">
			<div class="text-lg font-semibold mb-2">Campaign Operators:</div>
			<div class="px-2">
				{#each campaignOperators as _, i}
					<FormControl inputType="In" label="Operator {i + 1}">
						<input type="checkbox" class="checkbox" />
					</FormControl>
				{:else}
					<div class="text-center">No Operators</div>
				{/each}
			</div>
		</div>
	</div>
	<div class="divider" />

	<div class="text-lg font-semibold mb-2">New Contact to GHL</div>
	<FormControl label="New Contact Status">
		<div class="join">
			<select placeholder="Type here" class="select select-bordered w-full join-item">
				<option>Created</option>
			</select>
			<div class="btn btn-primary join-item">JSON from Text</div>
		</div>
	</FormControl>
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

	<FormControl
		inputType="In"
		label="Notification"
		labelClasses="font-semibold"
		secLabel="(if no reply from Customer)"
		secLabelClasses="text-sm"
	>
		<input type="checkbox" class="checkbox" bind:checked={notification} />
	</FormControl>

	{#if notification}
		<div class="px-4">
			<div class="label font-semibold">Send Notification to Operators</div>
			<div class="px-2 mb-4">
				<FormControl inputType="In" label="Send one by one (round-robin)">
					<input type="radio" name="abc" class="radio radio-primary" checked />
				</FormControl>

				<FormControl inputType="In" label="Send to All">
					<input type="radio" name="abc" class="radio radio-primary" checked />
				</FormControl>
			</div>

			<div class="flex items-start gap-2 mb-2">
				<div class="font-semibold">Operation Notification Wait Time:</div>
				<button class="z-10 text-success" on:click={() => (notificationAttempts = [...notificationAttempts, ''])}>
					<Icon icon="mdi:add-circle" width={24} />
				</button>
			</div>
			<div class="space-y-2 px-2 mb-2">
				{#each notificationAttempts as _, i}
					<FormControl label="Attempt {i + 1}">
						<div class="join">
							<input
								type="number"
								placeholder="Type here"
								class="input input-sm input-bordered w-full join-item"
								bind:value={notificationAttempts[i]}
							/>
							<div class="btn btn-sm join-item no-animation cursor-default">sec</div>
						</div>
					</FormControl>
				{:else}
					<div class="text-center">No Attempts</div>
				{/each}
			</div>

			<FormControl
				inputType="In"
				label="Escalate to Supervisor"
				labelClasses="font-semibold"
				secLabel="(if no pick from Operator)"
			>
				<input type="checkbox" class="checkbox" />
			</FormControl>
		</div>
	{/if}
</div>
