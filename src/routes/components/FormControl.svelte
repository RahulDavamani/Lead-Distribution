<script lang="ts">
	export let inputType: 'In' | 'Out' = 'Out';
	export let classes: string = '';
	export let label: string | undefined = undefined;
	export let labelClasses: string = '';
	export let secLabel: string | undefined = undefined;
	export let secLabelClasses: string = '';
	export let error: { message: string } | undefined = undefined;
	export let errorClasses: string = '';
</script>

<div class="form-control {classes}">
	{#if inputType === 'In'}
		<label class="label cursor-pointer justify-start gap-3">
			<slot />
			{#if label}
				<span class={labelClasses}>{label}</span>
				{#if secLabel}
					<span class={secLabelClasses}>{secLabel}</span>
				{/if}
			{/if}
		</label>
	{:else}
		{#if label}
			<div class="label">
				<span class="font-semibold {labelClasses}">{label}</span>
				{#if secLabel}
					<span class={secLabelClasses}>{secLabel}</span>
				{/if}
			</div>
		{/if}
		<slot />
	{/if}
	{#if error}
		<div class="label text-xs text-error {errorClasses}">{error.message}</div>
	{/if}
</div>
