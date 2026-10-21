<script lang="ts">
	import { Alert, AlertDescription } from "$lib/components/ui/alert";
	import { CircleCheck, CircleAlert } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type AlertVariant = "success" | "error" | "info";

	type Props = {
		variant: AlertVariant;
		message: string;
		children?: Snippet;
	};

	let { variant, message, children }: Props = $props();

	const alertVariantMap = {
		success: "success",
		error: "destructive",
		info: "info",
	} as const;

	const Icon = $derived(variant === "success" ? CircleCheck : CircleAlert);
</script>

{#if message}
	<Alert variant={alertVariantMap[variant]}>
		<Icon class="h-4 w-4" />
		<AlertDescription>
			{#if children}
				{@render children()}
			{:else}
				{message}
			{/if}
		</AlertDescription>
	</Alert>
{/if}
