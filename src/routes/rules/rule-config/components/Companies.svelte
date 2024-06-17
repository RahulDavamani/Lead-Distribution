<script lang="ts">
	import { nanoid } from 'nanoid';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import Flatpickr from 'svelte-flatpickr';
	import IconBtn from '../../../components/ui/IconBtn.svelte';
	import { allDays } from '$lib/data/allDays';
	import SelectTimezone from './SelectTimezone.svelte';
	import Icon from '@iconify/svelte';
	import moment from 'moment-timezone';

	$: ({
		masterData,
		rule: { companies }
	} = $ruleConfig);

	const addWorkingHours = (i: number) =>
		($ruleConfig.rule.companies[i].workingHours = [
			...$ruleConfig.rule.companies[i].workingHours,
			{
				id: nanoid(),
				start: moment.tz($ruleConfig.rule.companies[i].timezone).startOf('day').toDate(),
				end: moment.tz($ruleConfig.rule.companies[i].timezone).startOf('day').toDate(),
				days: ''
			}
		]);

	const deleteWorkingHours = (i: number, j: number) => {
		$ruleConfig.rule.companies[i].workingHours = $ruleConfig.rule.companies[i].workingHours.filter((_, k) => k !== j);
	};

	let showSelectTimezone = false;
	let companyI: number | undefined;
</script>

<div class="w-full h-fit pl-4">
	<details class="collapse collapse-arrow" open>
		<summary class="collapse-title px-0">
			<div>
				<span class="text-lg font-bold">Companies:</span>
				<span class="font-mono">({companies.length})</span>
			</div>
		</summary>
		<div class="collapse-content pl-2 max-h-[500px] overflow-auto">
			<div class="space-y-3 mt-1">
				{#each companies as { CompanyKey, workingHours }, i}
					{@const companyName =
						masterData.companies.find((c) => c.CompanyKey === CompanyKey)?.CompanyName ?? 'Invalid Company'}

					<div class="my-card">
						<div class="flex justify-between items-center">
							<div class="font-semibold">{companyName}</div>

							<label class="input input-bordered input-sm flex items-center gap-2 cursor-pointer">
								<Icon icon="mdi:timezone" width={16} />
								<input
									type="text"
									class="grow cursor-pointer"
									value={$ruleConfig.rule.companies[i].timezone.replaceAll('_', ' ').replaceAll('/', ' / ')}
									readonly
									on:click={() => {
										showSelectTimezone = true;
										companyI = i;
									}}
								/>
							</label>
						</div>
						<div class="divider m-0" />

						{#each workingHours as { days }, j}
							{@const daysArr = days.split(',')}
							{@const timezone = $ruleConfig.rule.companies[i].timezone}
							{@const workingHour = $ruleConfig.rule.companies[i].workingHours[j]}

							<div class="flex justify-between items-center mt-3 gap-4">
								<div class="flex items-center gap-3">
									<IconBtn
										icon="mdi:close"
										iconClasses="text-error"
										width={20}
										on:click={() => deleteWorkingHours(i, j)}
									/>
									<Flatpickr
										placeholder="Choose Time"
										class="input input-bordered input-sm cursor-pointer text-center w-24"
										value={moment.tz(workingHour.start, timezone).clone().tz(moment.tz.guess(), true).toDate()}
										on:close={(e) => {
											$ruleConfig.rule.companies[i].workingHours[j].start = moment
												.tz(e.detail[0][0].toLocaleString(), 'M/D/YYYY, h:mm:ss A', timezone)
												.toDate();
										}}
										options={{
											mode: 'time',
											altInput: true,
											allowInput: true
										}}
									/>
									to
									<Flatpickr
										placeholder="Choose Time"
										class="input input-bordered input-sm cursor-pointer text-center w-24"
										value={moment.tz(workingHour.end, timezone).clone().tz(moment.tz.guess(), true).toDate()}
										on:close={(e) => {
											$ruleConfig.rule.companies[i].workingHours[j].end = moment
												.tz(e.detail[0][0].toLocaleString(), 'M/D/YYYY, h:mm:ss A', timezone)
												.toDate();
										}}
										options={{
											mode: 'time',
											altInput: true,
											allowInput: true
										}}
									/>
								</div>

								<div class="flex flex-wrap">
									{#each allDays as day}
										<button
											class="btn p-0 px-1 btn-link no-underline hover:no-underline"
											on:click={() => {
												if (daysArr.includes(day))
													$ruleConfig.rule.companies[i].workingHours[j].days = daysArr
														.filter((d) => d !== day)
														.join(',');
												else {
													$ruleConfig.rule.companies[i].workingHours = $ruleConfig.rule.companies[i].workingHours.map(
														(wh, k) => {
															const daysArr = wh.days.split(',');
															if (k === j) wh.days = daysArr.concat(day).join(',');
															else wh.days = daysArr.filter((d) => d !== day).join(',');
															return wh;
														}
													);
												}
											}}
										>
											<div class="avatar placeholder">
												<div
													class="rounded-full w-9
                                          {daysArr.includes(day)
														? 'bg-success text-success-content'
														: 'bg-neutral text-neutral-content'}"
												>
													<span class="text-xs capitalize">{day}</span>
												</div>
											</div>
										</button>
									{/each}
								</div>
							</div>
							<div class="divider" />
						{/each}
						<button class="btn btn-success btn-sm w-full" on:click={() => addWorkingHours(i)}>
							<Icon icon="mdi:add" width={16} />
							Add Working Hours
						</button>
					</div>
				{/each}
			</div>
		</div>
	</details>
</div>

{#if showSelectTimezone && companyI !== undefined}
	<SelectTimezone bind:showModal={showSelectTimezone} bind:timezone={$ruleConfig.rule.companies[companyI].timezone} />
{/if}
