<script lang="ts">
	import { timeToSeconds, type Time, secondsToTime } from '$lib/client/DateTime';
	import { afterUpdate } from 'svelte';

	export let duration: number;
	let time: Time = secondsToTime(duration);
	afterUpdate(() => (time = secondsToTime(duration)));
</script>

<div class="join">
	<div class="input input-bordered flex items-center gap-1 join-item">
		<input
			type="number"
			class="grow max-w-8"
			placeholder="0"
			value={time.days}
			on:focusout={(e) => {
				time.days = Number(e.currentTarget.value);
				duration = timeToSeconds(time);
			}}
		/>
		<span class="font-mono opacity-75">Days</span>
	</div>
	<div class="input input-bordered flex items-center gap-1 join-item">
		<input
			type="number"
			class="grow max-w-8"
			placeholder="0"
			value={time.hours}
			on:focusout={(e) => {
				time.hours = Number(e.currentTarget.value);
				duration = timeToSeconds(time);
			}}
		/>
		<span class="font-mono opacity-75">Hrs</span>
	</div>
	<div class="input input-bordered flex items-center gap-1 join-item">
		<input
			type="number"
			class="grow max-w-8"
			placeholder="0"
			value={time.minutes}
			on:focusout={(e) => {
				time.minutes = Number(e.currentTarget.value);
				duration = timeToSeconds(time);
			}}
		/>
		<span class="font-mono opacity-75">Mins</span>
	</div>
	<div class="input input-bordered flex items-center gap-1 join-item">
		<input
			type="number"
			class="grow max-w-8"
			placeholder="0"
			value={time.seconds}
			on:focusout={(e) => {
				time.seconds = Number(e.currentTarget.value);
				duration = timeToSeconds(time);
			}}
		/>
		<span class="font-mono opacity-75">Secs</span>
	</div>
</div>

<style>
	.input {
		@apply outline-none;
	}
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
	}
</style>
