<script>
	import { ruleConfig } from '../../../../stores/ruleConfig.store';

	$: ({
		rule: { waitTimeForCustomerResponse }
	} = $ruleConfig);
</script>

<div class="form-control flex flex-row items-center">
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<label class="label cursor-pointer justify-start gap-4">
		<input
			type="checkbox"
			class="checkbox"
			checked={waitTimeForCustomerResponse !== null}
			on:click={() => {
				if (waitTimeForCustomerResponse === null) $ruleConfig.rule.waitTimeForCustomerResponse = 0;
				else $ruleConfig.rule.waitTimeForCustomerResponse = null;
			}}
		/>
		<span class="font-semibold text-left">Wait time for the Customer Text Response</span>
	</label>
	{#if waitTimeForCustomerResponse !== null}
		<div class="join w-full">
			<input
				type="number"
				placeholder="Type here"
				class="input input-bordered w-full join-item"
				bind:value={$ruleConfig.rule.waitTimeForCustomerResponse}
			/>
			<div class="btn join-item no-animation cursor-default">sec</div>
		</div>
	{/if}
</div>
