<script lang="ts">
	import Icon from '@iconify/svelte';

	export let inputType: 'In' | 'Out' = 'Out';
	export let classes: string = '';

	export let icon: string | undefined = undefined;
	export let iconWidth: number = 20;

	export let label: string | undefined = undefined;
	export let labelClasses: string = '';
	export let labelOnclick: () => void = () => {};

	export let secLabel: string | undefined = undefined;
	export let secLabelClasses: string = '';

	export let bottomLabel: string | undefined = undefined;
	export let bottomLabelClasses: string = '';

	export let error: { message: string } | undefined = undefined;
	export let errorClasses: string = '';
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-label-has-associated-control -->
<div class="form-control {classes}">
	{#if inputType === 'In'}
		<label class="label cursor-pointer justify-start gap-3" on:click={labelOnclick}>
			<slot />
			{#if label}
				<span class="{labelClasses} {icon && 'flex justify-start gap-2 items-center'}">
					{#if icon}
						<Icon {icon} width={iconWidth} />
					{/if}
					{label}
				</span>
				{#if secLabel}
					<span class={secLabelClasses}>{secLabel}</span>
				{/if}
			{/if}
		</label>

		{#if bottomLabel}
			<span class="label text-xs {bottomLabelClasses}">
				{bottomLabel}
			</span>
		{/if}
	{:else}
		{#if label}
			<div class="label">
				<label
					class="font-semibold {labelClasses} {icon && 'flex justify-start gap-2 items-center'}"
					on:click={labelOnclick}
				>
					{#if icon}
						<Icon {icon} width={iconWidth} />
					{/if}
					{label}
				</label>
				{#if secLabel}
					<span class={secLabelClasses}>{secLabel}</span>
				{/if}
			</div>
		{/if}

		<slot />

		{#if bottomLabel}
			<span class="label text-xs {bottomLabelClasses}">
				{bottomLabel}
			</span>
		{/if}
	{/if}
	{#if error}
		<div class="label text-xs text-error {errorClasses}">{error.message}</div>
	{/if}
</div>
