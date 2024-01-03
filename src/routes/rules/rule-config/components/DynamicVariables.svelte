<script>
	import { copyToClipboard } from '$lib/client/copyToClipboard';
	import Icon from '@iconify/svelte';
</script>

<div class="dropdown dropdown-top dropdown-end">
	<div tabindex="0" role="button" class="btn btn-sm btn-info m-1">Dynamic Variables</div>
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div tabindex="0" class="dropdown-content z-[1] p-1 border shadow bg-base-100 rounded-box w-52">
		<div class="overflow-x-auto">
			<table class="table table-xs border-b">
				<tbody>
					<tr>
						<td class="text-sm flex justify-between items-center">
							CustomerFirstName
							<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard('CustomerFirstName')}>
								<Icon icon="mdi:content-copy" width={16} />
							</button>
						</td>
					</tr>
					<tr>
						<td class="text-sm flex justify-between items-center">
							CustomerLastName
							<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard('CustomerLastName')}>
								<Icon icon="mdi:content-copy" width={16} />
							</button>
						</td>
					</tr>
					<tr>
						<td class="text-sm flex justify-between items-center">
							Email
							<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard('Email')}>
								<Icon icon="mdi:content-copy" width={16} />
							</button>
						</td>
					</tr>
					<tr>
						<td class="text-sm flex justify-between items-center">
							Address
							<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard('Address')}>
								<Icon icon="mdi:content-copy" width={16} />
							</button>
						</td>
					</tr>
					<tr>
						<td class="text-sm flex justify-between items-center">
							ZipCode
							<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard('ZipCode')}>
								<Icon icon="mdi:content-copy" width={16} />
							</button>
						</td>
					</tr>
					<tr>
						<td class="text-sm flex justify-between items-center">
							OutboundCallNumber
							<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard('OutboundCallNumber')}>
								<Icon icon="mdi:content-copy" width={16} />
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div class="text-xs opacity-70 p-2">
			Use dynamic variables by incorporating them within double curly braces {'`{{}}`'}
		</div>
	</div>
</div>
