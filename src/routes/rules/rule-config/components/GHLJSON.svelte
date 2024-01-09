<script lang="ts">
	import Icon from '@iconify/svelte';
	import FormControl from '../../../components/FormControl.svelte';
	import Modal from '../../../components/Modal.svelte';

	type JSON = { [key: string]: string | string[] | JSON | JSON[] };
	let json: JSON = {
		firstName: '%%firstName%%',
		lastName: '%%lastName%%',
		name: '%%name%%',
		email: '%%email%%',
		locationId: 'hDB2VOBKJbwuhZ96LemY',
		phone: '%%phone%%',
		address1: '%%address1%%',
		postalCode: '%%postalCode%%',
		tags: ['contact'],
		customFields: [
			{
				id: 'company_bundleretailerid',
				key: 'company_bundleretailerid',
				field_value: '%%bundleretailerid%%'
			},
			{
				id: 'xxtrustedformcerturl',
				key: 'xxtrustedformcerturl',
				field_value: '%%xxtrustedformcerturl%%'
			},
			{
				id: 'contact_lead_source',
				key: 'contact_lead_source',
				field_value: '%%retailer_name%%'
			},
			{
				id: 'retailer_name',
				key: 'retailer_name',
				field_value: '%%retailer_name%%'
			},
			{
				id: 'agree_to_contact',
				key: 'agree_to_contact',
				field_value: '%%agree_to_contact%%'
			},
			{
				id: 'agree_to_terms',
				key: 'agree_to_terms',
				field_value: '%%agree_to_terms%%'
			},
			{
				id: 'affiliate_name',
				key: 'affiliate_name',
				field_value: '%%retailer_name%%'
			}
		],
		source: '%%retailer_name%%',
		country: 'US',
		companyName: '%%retailer_name%%'
	};

	let path: (string | number)[] = ['customFields', 0, 'field_value'];
	$: curJson = path.reduce((acc, cur) => acc?.[cur], json);

	const isArray = (a: object) => !!a && a.constructor === Array;
	const updateJsonKey = (key: string, updatedKey: string) =>
		(json = Object.fromEntries(Object.entries(json).map(([k, v]) => (k === key ? [updatedKey, v] : [k, v]))));
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<Modal title="GHL JSON" boxClasses="max-w-full">
	<div class="flex">
		{#key curJson}
			<div class="px-4 mx-2 bg-neutral rounded-box w-1/3">
				<json-viewer data={curJson} />
			</div>
		{/key}
		<div class="divider divider-horizontal" />
		<div class="flex-grow">
			<div class="flex justify-between mb-2">
				<div>
					<div class="text-sm breadcrumbs">
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
				</div>
			</div>

			{#each Object.entries(curJson) as [key, value]}
				{@const inputValue = typeof value === 'string' ? value : isArray(value) ? 'List []' : 'Map {}'}
				<div class="flex gap-4">
					<FormControl classes="w-full" label="Key">
						<input
							type="text"
							placeholder="Type here"
							class="input input-bordered"
							value={key}
							on:change={(e) => updateJsonKey(key, e.currentTarget.value)}
						/>
					</FormControl>
					<FormControl classes="w-full" label="Value">
						<input
							type="text"
							placeholder="Type here"
							class="input input-bordered cursor-pointer"
							value={inputValue}
							readonly
						/>
					</FormControl>
				</div>
			{/each}
		</div>
	</div>
</Modal>
