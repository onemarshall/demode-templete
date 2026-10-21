<!-- src/routes/auth/(app)/security/+page.svelte -->
<script lang="ts">
	import SecurityTab from '#lib/components/profile/tabs/SecurityTab.svelte';
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';

	let { data } = $props();

	let user = $derived(data.user);
	let session = $derived(data.session);

	// Detect if user is logged in via SIWE (Ethereum wallet)
	const isSiweLogin = $derived(
		(user as any)?.lastLoginMethod === 'siwe' ||
			(user as any)?.walletAddresses?.length > 0
	);
</script>

<div class="mx-auto w-full max-w-4xl space-y-6">
	<PageHeader
		title="Security"
		description="Manage your password, authentication methods, and account security."
	/>

	{#if user && session}
		<SecurityTab {user} {session} {isSiweLogin} />
	{/if}
</div>
