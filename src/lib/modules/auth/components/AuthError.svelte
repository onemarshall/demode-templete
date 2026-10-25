<!-- src/lib/modules/auth/components/AuthError.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { TriangleAlert, RefreshCw, House, LogIn } from '@lucide/svelte';

	interface Props {
		error: string;
		retry?: () => void;
		showHomeButton?: boolean;
		showSignInButton?: boolean;
	}

	let { error, retry, showHomeButton = false, showSignInButton = true }: Props = $props();

	// Determine error type and customize UI accordingly (reactive)
	const isSessionError = $derived(
		error.toLowerCase().includes('session') || error.toLowerCase().includes('unauthorized')
	);
	const isNetworkError = $derived(
		error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')
	);
</script>

<div class="container mx-auto max-w-2xl p-6">
	<Card.Root class="border-destructive/20">
		<Card.Header class="pb-4 text-center">
			<div
				class="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
			>
				<TriangleAlert class="text-destructive h-8 w-8" />
			</div>
			<Card.Title class="mt-4 text-xl">
				{#if isSessionError}
					Authentication Error
				{:else if isNetworkError}
					Connection Error
				{:else}
					Something went wrong
				{/if}
			</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-6">
			<Alert.Root variant="destructive">
				<Alert.Description class="text-center">
					{error}
				</Alert.Description>
			</Alert.Root>

			<!-- Error-specific guidance -->
			{#if isSessionError}
				<div class="text-muted-foreground text-center text-sm">
					Your session may have expired or become invalid. Please sign in again to continue.
				</div>
			{:else if isNetworkError}
				<div class="text-muted-foreground text-center text-sm">
					Please check your internet connection and try again.
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				{#if retry}
					<Button onclick={retry} variant="outline" class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4" />
						Try Again
					</Button>
				{/if}

				{#if showSignInButton}
					<Button
						onclick={() => (window.location.href = '/auth/sign-in')}
						class="flex items-center gap-2"
					>
						<LogIn class="h-4 w-4" />
						Sign In
					</Button>
				{/if}

				{#if showHomeButton}
					<Button
						variant="ghost"
						onclick={() => (window.location.href = '/')}
						class="flex items-center gap-2"
					>
						<House class="h-4 w-4" />
						Go Home
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
