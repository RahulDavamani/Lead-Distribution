<script lang="ts">
	import { copyToClipboard } from '$lib/client/copyToClipboard';
	import Icon from '@iconify/svelte';

	export let variables: string[] = [];
	export let insertVariable: (variable: string) => void = () => {};
	export let isTop: boolean = true;
	export let btnClass: string = '';

	$: allVariables = [
		'CustomerFirstName',
		'CustomerLastName',
		'Email',
		'Address',
		'ZipCode',
		'RuleName',
		'OutboundCallNumber',
		'LeadCreatedOn',
		'LeadTimeElapsed',
		...variables
	];
</script>

<div class="dropdown {isTop ? 'dropdown-top' : 'dropdown-bottom'} dropdown-end">
	<div tabindex="0" role="button" class="btn btn-info join-item {btnClass}">Variables</div>
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div
		tabindex="0"
		class="dropdown-content z-[1] p-1 border shadow bg-base-100 rounded-box w-80 {isTop ? 'mb-1' : 'mt-1'}"
	>
		<div class="overflow-x-auto">
			<table class="table table-xs border-b">
				<tbody>
					{#each allVariables as dv}
						<tr>
							<td class="text-sm flex justify-between items-center">
								{dv}
								<div class="flex">
									<button class="btn btn-xs btn-ghost text-primary" on:click={() => copyToClipboard(`{{${dv}}}`)}>
										<Icon icon="mdi:content-copy" width={16} />
									</button>
									<button class="btn btn-xs btn-ghost text-primary" on:click={() => insertVariable(`{{${dv}}}`)}>
										<Icon icon={isTop ? 'mdi:arrow-collapse-down' : 'mdi:arrow-collapse-up'} width={16} />
									</button>
								</div>
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
