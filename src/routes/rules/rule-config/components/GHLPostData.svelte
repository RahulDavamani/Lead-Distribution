<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import Modal from '../../../components/Modal.svelte';
	import { ruleConfig } from '../../../../stores/ruleConfig.store';
	import Variables from './Variables.svelte';
	import { onMount } from 'svelte';

	type JSON = { [key: string]: string | number | JSON | (string | number | JSON)[] };
	type JSONType = 'single' | 'list' | 'map';

	// let json: JSON = {
	// 	firstName: '%%firstName%%',
	// 	lastName: '%%lastName%%',
	// 	name: '%%name%%',
	// 	email: '%%email%%',
	// 	locationId: 'hDB2VOBKJbwuhZ96LemY',
	// 	phone: '%%phone%%',
	// 	address1: '%%address1%%',
	// 	postalCode: '%%postalCode%%',
	// 	tags: ['contact'],
	// 	customFields: [
	// 		{
	// 			id: 'company_bundleretailerid',
	// 			key: 'company_bundleretailerid',
	// 			field_value: '%%bundleretailerid%%'
	// 		},
	// 		{
	// 			id: 'xxtrustedformcerturl',
	// 			key: 'xxtrustedformcerturl',
	// 			field_value: '%%xxtrustedformcerturl%%'
	// 		},
	// 		{
	// 			id: 'contact_lead_source',
	// 			key: 'contact_lead_source',
	// 			field_value: '%%retailer_name%%'
	// 		},
	// 		{
	// 			id: 'retailer_name',
	// 			key: 'retailer_name',
	// 			field_value: '%%retailer_name%%'
	// 		},
	// 		{
	// 			id: 'agree_to_contact',
	// 			key: 'agree_to_contact',
	// 			field_value: '%%agree_to_contact%%'
	// 		},
	// 		{
	// 			id: 'agree_to_terms',
	// 			key: 'agree_to_terms',
	// 			field_value: '%%agree_to_terms%%'
	// 		},
	// 		{
	// 			id: 'affiliate_name',
	// 			key: 'affiliate_name',
	// 			field_value: '%%retailer_name%%'
	// 		}
	// 	],
	// 	source: '%%retailer_name%%',
	// 	country: 'US',
	// 	companyName: '%%retailer_name%%'
	// };

	export let showModal: boolean;
	export let jsonText: string;

	onMount(() => {
		json = JSON.parse(jsonText);
		getCurJson(path);
	});

	let json: JSON = {};
	let path: (string | number)[] = [];

	let curJson: JSON[''] = json;
	const getCurJson = (path: (string | number)[]) =>
		(curJson = path.reduce((acc, cur) => acc?.[cur] as JSON, json) as JSON);

	$: getCurJson(path);

	const syncJson = (curJson: JSON['']) => {
		if (path.length === 0) return;
		let currentObj: JSON = json;
		for (let i = 0; i < path.length - 1; i++) currentObj = currentObj[path[i]] as JSON;
		currentObj[path[path.length - 1]] = curJson;
	};
	$: syncJson(curJson);

	const getJsonType = (json: JSON['']): JSONType =>
		typeof json === 'object' ? (Array.isArray(json) ? 'list' : 'map') : 'single';
	$: curJsonType = getJsonType(curJson);

	const changeJsonType = (jsonType: JSONType) =>
		(curJson = (jsonType === 'single' ? '' : jsonType === 'list' ? [] : {}) as JSON);

	const updateJsonKey = (key: string, updatedKey: string) => {
		if (typeof curJson !== 'object' || Array.isArray(curJson)) return;
		let i = Object.keys(curJson).findIndex((k) => k === key);
		const entries = Object.entries(curJson).slice(i);
		for (const [k] of entries) delete curJson[k];

		for (const [k, v] of entries) {
			if (k === key) curJson[updatedKey] = v;
			else curJson[k] = v;
		}
	};

	const addValue = async () => {
		if (curJsonType === 'list' && Array.isArray(curJson)) curJson[curJson.length] = '';
		else if (curJsonType === 'map' && typeof curJson === 'object' && !Array.isArray(curJson)) curJson[''] = '';
	};

	const deleteValue = (i: number) => {
		if (curJsonType === 'list' && Array.isArray(curJson)) curJson = curJson.filter((_, index) => index !== i);
		else if (curJsonType === 'map' && typeof curJson === 'object' && !Array.isArray(curJson)) {
			const key = Object.keys(curJson)[i];
			delete curJson[key];
			curJson = curJson;
		}
	};

	const saveJson = () => {
		$ruleConfig.rule.ghlPostData = JSON.stringify(json);
		showModal = false;
	};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<Modal title="GHL JSON" boxClasses="max-w-full overflow-hidden" bind:showModal>
	<div class="flex">
		<!-- JSON Viewer -->
		{#key curJson}
			<div class="px-4 mx-2 bg-neutral rounded-box w-full {curJsonType === 'single' && 'pt-4'}">
				<json-viewer data={curJson} />
			</div>
		{/key}
		<div class="divider divider-horizontal" />

		<div class="w-full overflow-auto pr-4" style="height: 80vh;">
			<div class="flex justify-between items-center mb-3">
				<!-- Path -->
				<div>
					<div class="text-sm font-semibold breadcrumbs">
						<ul>
							<li class="cursor-pointer" on:click={() => (path = [])}>
								<Icon icon="mdi:home" width={18} />
							</li>
							{#each path as p, i}
								<li
									class={i !== path.length - 1 ? 'cursor-pointer hover:underline' : 'cursor-default'}
									on:click={() => (path = path.slice(0, i + 1))}
								>
									{p}
								</li>
							{/each}
						</ul>
					</div>
					{#if path.length > 0}
						<button
							class="btn btn-sm btn-link p-0 text-black no-underline hover:no-underline"
							on:click={() => (path = path.slice(0, path.length - 1))}
						>
							<Icon icon="mdi:backburger" width={18} /> Back
						</button>
					{/if}
				</div>

				<!-- Save Button -->
				<button class="btn btn-sm btn-success" on:click={saveJson}>
					<Icon icon="mdi:content-save" width={18} />
					Save
				</button>
			</div>

			<!-- Value Type -->
			{#if path.length !== 0}
				<div class="tabs tabs-boxed my-3">
					<button class="tab {curJsonType === 'single' && 'tab-active'}" on:click={() => changeJsonType('single')}>
						Single
					</button>
					<button class="tab {curJsonType === 'list' && 'tab-active'}" on:click={() => changeJsonType('list')}>
						List
					</button>
					<button class="tab {curJsonType === 'map' && 'tab-active'}" on:click={() => changeJsonType('map')}>
						Map
					</button>
				</div>
			{/if}

			<!-- Values -->
			{#if curJsonType === 'single'}
				{@const isString = typeof curJson === 'string'}
				<FormControl classes="w-full" label="Value">
					<div class="join">
						<input
							type={isString ? 'text' : 'number'}
							placeholder="Type here"
							class="input input-bordered join-item w-full"
							value={curJson}
							on:change={(e) => (curJson = isString ? e.currentTarget.value : Number(e.currentTarget.value))}
						/>
						<select
							class="select select-bordered join-item"
							value={isString ? 'string' : 'number'}
							on:change={(e) => (curJson = e.currentTarget.value === 'string' ? '' : 0)}
						>
							<option value="string">String</option>
							<option value="number">Number</option>
						</select>
						<Variables isTop={false} variables={['Phone']} insertVariable={(v) => (curJson += v)} />
					</div>
				</FormControl>
			{:else if curJsonType === 'list' && Array.isArray(curJson)}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th class="text-center">#</th>
								<th>Value Type</th>
								<th class="text-center">
									<button class="btn btn-xs btn-accent" on:click={addValue}>
										<Icon icon="mdi:add" width={20} /> Add
									</button>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each curJson as value, i}
								{@const isString = typeof value === 'string'}
								<tr>
									<td class="text-center p-0">{i}</td>
									<td>
										{#if getJsonType(value) === 'single'}
											<input
												type={isString ? 'text' : 'number'}
												placeholder="Type here"
												class="input input-bordered input-sm w-full"
												{value}
												on:change={(e) => {
													if (Array.isArray(curJson))
														curJson[i] = isString ? e.currentTarget.value : Number(e.currentTarget.value);
												}}
											/>
										{:else if getJsonType(value) === 'list' && Array.isArray(value)}
											<input
												type="text"
												class="input input-bordered input-sm w-full"
												value="List ({value.length})"
												disabled
											/>
										{:else}
											<input
												type="text"
												class="input input-bordered input-sm w-full"
												value="Map ({Object.keys(value).length})"
												disabled
											/>
										{/if}
									</td>

									<td class="w-32">
										<div class="flex justify-center gap-2">
											<button class="btn btn-link text-info p-0" on:click={() => (path = [...path, i])}>
												<Icon icon="mdi:edit" width={25} />
											</button>
											<button class="btn btn-link text-error p-0" on:click={() => deleteValue(i)}>
												<Icon icon="mdi:delete" width={25} />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th class="text-center">#</th>
								<th>Key</th>
								<th>Value Type</th>
								<th class="text-center">
									<button class="btn btn-xs btn-accent" on:click={addValue}>
										<Icon icon="mdi:add" width={20} /> Add
									</button>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each Object.entries(curJson) as [key, value], i}
								{@const isString = typeof value === 'string'}
								<tr>
									<td class="text-center p-0">{i}</td>
									<td>
										<input
											type="text"
											placeholder="Type here"
											class="input input-bordered input-sm w-full"
											value={key}
											on:change={(e) => updateJsonKey(key, e.currentTarget.value)}
										/>
									</td>
									<td>
										{#if getJsonType(value) === 'single'}
											<input
												type={isString ? 'text' : 'number'}
												placeholder="Type here"
												class="input input-bordered input-sm w-full"
												{value}
												on:change={(e) => {
													if (typeof curJson === 'object' && !Array.isArray(curJson))
														curJson[key] = isString ? e.currentTarget.value : Number(e.currentTarget.value);
												}}
											/>
										{:else if getJsonType(value) === 'list' && Array.isArray(value)}
											<input
												type="text"
												class="input input-bordered input-sm w-full"
												value="List ({value.length})"
												disabled
											/>
										{:else}
											<input
												type="text"
												class="input input-bordered input-sm w-full"
												value="Map ({Object.keys(value).length})"
												disabled
											/>
										{/if}
									</td>

									<td class="w-32">
										<div class="flex justify-center gap-2">
											<button class="btn btn-link text-info p-0" on:click={() => (path = [...path, key])}>
												<Icon icon="mdi:edit" width={25} />
											</button>
											<button class="btn btn-link text-error p-0" on:click={() => deleteValue(i)}>
												<Icon icon="mdi:delete" width={25} />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</Modal>
