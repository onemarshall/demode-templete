<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	type FieldIssue = {
		message: string;
	};

	type Props = {
		label?: string;
		placeholder?: string;
		disabled?: boolean;
		value?: string;
		issues?: FieldIssue[];
		error?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		inputProps?: Record<string, any>;
		id?: string;
		required?: boolean;
		oninput?: (event: Event) => void;
		onblur?: (event: Event) => void;
	};

	let {
		label = "Email",
		placeholder = "Enter your email",
		disabled = false,
		value = $bindable(""),
		issues = [],
		error = "",
		inputProps,
		id,
		required = false,
		oninput,
		onblur,
	}: Props = $props();

	const resolvedIssues = $derived(
		issues.length > 0 ? issues : error ? [{ message: error }] : [],
	);
</script>

<div class="space-y-2">
	{#if label}
		<Label for={id}>{label}</Label>
	{/if}
	{#if inputProps}
		<Input
			{...inputProps as any}
			{id}
			{placeholder}
			{disabled}
			{required}
			{oninput}
			{onblur}
		/>
	{:else}
		<Input
			type="email"
			{id}
			bind:value
			{placeholder}
			{disabled}
			{required}
			autocomplete="email"
			{oninput}
			{onblur}
		/>
	{/if}
	{#each resolvedIssues as issue}
		<p class="text-destructive text-sm">{issue.message}</p>
	{/each}
</div>
