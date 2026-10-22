<!-- src/routes/auth/profile/+page.svelte -->
<script lang="ts">
	import GeneralTab from "#lib/components/profile/tabs/GeneralTab.svelte";
	import DeleteTab from "#lib/components/profile/tabs/DeleteTab.svelte";
	import SiweTab from "#lib/components/profile/tabs/SiweTab.svelte";
	import PageHeader from "#lib/components/efferd/app-shell/app-shell-2/page-header.svelte";

	let { data } = $props();

	// Error boundary for missing data
	let error = $derived(
		!data
			? "No data received from server"
			: !data.user
				? "No user data found"
				: !data.session
					? "No session data found"
					: null,
	);

	let user = $derived(data.user);

	// Detect if user is logged in via SIWE (Ethereum wallet)
	const isSiweLogin = $derived.by(() => {
		const u = user as { lastLoginMethod?: string | null; walletAddresses?: unknown[] } | undefined;
		return u?.lastLoginMethod === "siwe" || (u?.walletAddresses?.length ?? 0) > 0;
	});

	// Detect if user is logged in via social login (GitHub, Google, etc.)
	// Exclude non-social methods: email, password, credential, siwe, magic-link, otp, passkey
	const isSocialLoginOnly = $derived(
		!!(
			user?.lastLoginMethod &&
			user.lastLoginMethod !== "email" &&
			user.lastLoginMethod !== "password" &&
			user.lastLoginMethod !== "credential" &&
			user.lastLoginMethod !== "siwe" &&
			user.lastLoginMethod !== "magic-link" &&
			user.lastLoginMethod !== "otp" &&
			user.lastLoginMethod !== "passkey"
		),
	);
</script>

<div class="mx-auto w-full max-w-4xl space-y-6">
	<PageHeader
		title="Profile"
		description="Manage your profile information and account."
	/>
	{#if error}
		<div class="border border-red-200 bg-red-50 p-4 text-red-700">
			<h2 class="font-bold">Profile Page Error</h2>
			<p>{error}</p>
			<p class="text-sm">Check the browser console for more details.</p>
		</div>
	{/if}

	{#if isSiweLogin}
		<SiweTab {user} />
	{/if}

	<GeneralTab {user} form={data.form} {isSocialLoginOnly} {isSiweLogin} />

	<DeleteTab {user} />
</div>
