<script lang="ts">
	import moment from 'moment-timezone';
	import IconBtn from '../../../components/ui/IconBtn.svelte';

	export let showModal: boolean;
	export let timezone: string;
	let [region, city] = timezone.split('/');
	let search = '';
	$: if (region) city = '';

	const groupedTimezones = moment.tz.names().reduce(
		(acc, timezone) => {
			const [region, ...city] = timezone.split('/');
			if (city.length) {
				if (!acc[region]) acc[region] = [];
				acc[region].push(city.join('/'));
			} else {
				if (!acc.Others) acc.Others = [];
				acc.Others.push(region);
			}
			return acc;
		},
		{} as { [key: string]: string[] }
	);

	$: cities = groupedTimezones[region].filter((city) =>
		city.replaceAll('_', '').toLowerCase().includes(search.replaceAll(' ', '').toLowerCase())
	);

	const selectTimezone = () => {
		timezone = region !== 'Others' ? `${region}/${city}` : city;
		showModal = false;
	};
</script>

<div class="modal {showModal && 'modal-open'}">
	<div class="modal-box">
		<div class="flex justify-between items-center">
			<div class="text-lg font-bold">Select Timezone</div>
			<IconBtn icon="mdi:close" iconClasses="text-error" on:click={() => (showModal = false)} />
		</div>

		<div class="flex my-3 gap-3">
			<select class="select select-bordered" bind:value={region}>
				{#each Object.keys(groupedTimezones) as region}
					<option value={region}>{region}</option>
				{/each}
			</select>
			<input type="text" class="input input-bordered w-full" placeholder="Search..." bind:value={search} />
		</div>

		<div class="h-96 overflow-y-scroll shadow-inner">
			{#each cities as c}
				<div class="form-control">
					<label class="label cursor-pointer flex justify-start gap-5">
						<input type="radio" name="city" class="radio radio-sm radio-success" value={c} bind:group={city} />
						<span>{c.replaceAll('_', ' ').replaceAll('/', ' / ')} </span>
					</label>
				</div>
				<div class="divider m-0" />
			{/each}
		</div>

		<button class="btn btn-primary {city === '' && 'btn-disabled'} w-full mt-4" on:click={selectTimezone}>
			{#if region !== 'Others'}
				{region} / {city.replaceAll('_', ' ').replaceAll('/', ' / ')}
			{:else}
				{city.replaceAll('_', ' ').replaceAll('/', ' / ')}
			{/if}
		</button>
	</div>
</div>
