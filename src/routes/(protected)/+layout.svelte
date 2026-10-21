<!-- src/routes/(protected)/+layout.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '#lib/auth-client.js';
	import AuthError from '#lib/components/auth/AuthError.svelte';
	import SessionSkeleton from '#lib/components/auth/SessionSkeleton.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// The live session store only drives post-hydration updates (e.g. session
	// expiry mid-navigation). The render branch is derived from `data.user`,
	// which is serialized load data and therefore identical during SSR and
	// hydration — branching on `$session.isPending` would diverge.
	const session = authClient.useSession();
	const sessionError = $derived($session?.error?.message);
</script>

{#if sessionError}
	<AuthError error={sessionError} retry={() => invalidateAll()} showHomeButton={true} />
{:else if !data.user}
	<SessionSkeleton />
{:else}
	{@render children()}
{/if}
