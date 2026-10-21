<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { PasswordInput } from "$lib/components/ui/password-input";
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
		inputProps?: Record<string, any>;
		id?: string;
		required?: boolean;
		oninput?: (event: Event) => void;
		onblur?: (event: Event) => void;
		description?: string;
	};

	let {
		label = "Password",
		placeholder = "Enter your password",
		disabled = false,
		value = $bindable(""),
		issues = [],
		error = "",
		inputProps,
		id,
		required = false,
		oninput,
		onblur,
		description,
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
		<PasswordInput
			{...inputProps as any}
			{id}
			{placeholder}
			{disabled}
			{required}
			{oninput}
			{onblur}
		/>
	{:else}
		<PasswordInput
			{id}
			bind:value
			{placeholder}
			{disabled}
			{required}
			autocomplete="current-password"
			{oninput}
			{onblur}
		/>
	{/if}
	{#if description}
		<p class="text-muted-foreground text-sm">{description}</p>
	{/if}
	{#each resolvedIssues as issue}
		<p class="text-destructive text-sm">{issue.message}</p>
	{/each}
</div>
