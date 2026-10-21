<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { publicEnv } from '$lib/auth/shared/env';
	import { logger } from '$lib/auth/shared/logger';
	import { GalleryVerticalEnd as GalleryVerticalEndIcon, LogOut, Copy } from '@lucide/svelte';
	import type { User } from 'better-auth';
	import type { SerializedUser } from '$lib/auth/shared/types/serialized-auth';

	// Define a type that's compatible with both User and SerializedUser
	type NavUser = {
		id: string;
		email: string;
		name?: string | null;
		image?: string | null;
	};

	let { user = null }: { user?: NavUser | null } = $props();

	const session = authClient.useSession();

	// Use server-provided user if available, otherwise client session
	// We cast to NavUser to satisfy the type checker since both sources are compatible with our needs
	const currentUser = $derived((user ?? $session.data?.user) as NavUser | null | undefined);
	const isAuthenticated = $derived(Boolean(currentUser));
	const appName = publicEnv.PUBLIC_APP_NAME;

	// Get wallet address from user data
	const walletAddress = $derived(currentUser?.email || currentUser?.id);
	const displayAddress = $derived(
		walletAddress
			? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
			: ''
	);

	async function handleSignOut() {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						// Invalidate all data to force re-fetch of session
						invalidateAll();
						// Navigate to sign-in page
						goto('/auth/sign-in');
					}
				}
			});
		} catch (error) {
			logger.error('Sign out error:', error);
			// Still navigate even if there's an error
			await goto('/auth/sign-in');
		}
	}

	async function copyAddress() {
		if (walletAddress) {
			await navigator.clipboard.writeText(walletAddress);
		}
	}
</script>

<nav class="bg-background border-b">
	<div class="container mx-auto flex h-14 items-center justify-between gap-4 px-6">
		<a href="/" class="flex items-center gap-2 text-sm font-semibold">
			<span
				class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md"
			>
				<GalleryVerticalEndIcon class="size-4" />
			</span>
			<span>{appName}</span>
		</a>
		<div class="flex items-center gap-2">
			{#if isAuthenticated}
				<div class="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
					<span class="text-foreground text-sm font-medium">{displayAddress}</span>
					<button
						onclick={copyAddress}
						class="text-muted-foreground hover:text-foreground transition-colors"
						title="Copy wallet address"
					>
						<Copy class="size-4" />
					</button>
				</div>
				<Button variant="ghost" href="/admin/security">Security</Button>
				<Button variant="ghost" href="/auth/profile">Profile</Button>
				<Button variant="outline" onclick={handleSignOut}>
					<LogOut class="size-4" />
					Sign out
				</Button>
			{:else}
				<Button variant="ghost" href="/auth/sign-in">Sign in</Button>
				<Button href="/auth/sign-up">Create account</Button>
			{/if}
		</div>
	</div>
</nav>
