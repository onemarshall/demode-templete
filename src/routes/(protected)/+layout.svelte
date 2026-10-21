<!-- src/routes/(protected)/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import AuthError from '$lib/components/auth/AuthError.svelte';
	import SessionSkeleton from '$lib/components/auth/SessionSkeleton.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Get the session store
	const session = authClient.useSession();

	// Access session values reactively with proper typing
	const sessionData = $derived($session);
	const sessionError = $derived(sessionData?.error?.message);
	const isLoading = $derived(sessionData?.isPending ?? false);
</script>

{#if sessionError}
	<AuthError error={sessionError} retry={() => invalidateAll()} showHomeButton={true} />
{:else if isLoading}
	<SessionSkeleton />
{:else}
	{@render children()}
{/if}
