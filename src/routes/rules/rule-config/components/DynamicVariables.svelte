<script>
	import { copyToClipboard } from '$lib/client/copyToClipboard';
	import Icon from '@iconify/svelte';

	const dynamicVariables = [
		'CustomerFirstName',
		'CustomerLastName',
		'Email',
		'Address',
		'ZipCode',
		'RuleName',
		'OutboundCallNumber',
		'LeadCreatedOn',
		'LeadTimeElapsed'
	];
</script>

<div class="dropdown dropdown-top dropdown-end">
	<div tabindex="0" role="button" class="btn btn-sm btn-info m-1">Dynamic Variables</div>
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div tabindex="0" class="dropdown-content z-[1] p-1 border shadow bg-base-100 rounded-box w-52">
		<div class="overflow-x-auto">
			<table class="table table-xs border-b">
				<tbody>
					{#each dynamicVariables as dv}
						<tr>
							<td class="text-sm flex justify-between items-center">
								{dv}
								<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard(`{{${dv}}}`)}>
									<Icon icon="mdi:content-copy" width={16} />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="text-xs opacity-70 p-2">
			Use dynamic variables by incorporating them within double curly braces {'`{{}}`'}
		</div>
	</div>
</div>
