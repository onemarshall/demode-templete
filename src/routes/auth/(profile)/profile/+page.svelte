<!-- src/routes/auth/profile/+page.svelte -->
<script lang="ts">
	import GeneralTab from "$lib/components/profile/tabs/GeneralTab.svelte";
	import SecurityTab from "$lib/components/profile/tabs/SecurityTab.svelte";
	import SessionsTab from "$lib/components/profile/tabs/SessionsTab.svelte";
	import DeleteTab from "$lib/components/profile/tabs/DeleteTab.svelte";
	import SiweTab from "$lib/components/profile/tabs/SiweTab.svelte";
	import SubscriptionStatus from "$lib/components/billing/SubscriptionStatus.svelte";
	import CustomerPortalButton from "$lib/components/billing/CustomerPortalButton.svelte";
	import { Button } from "$lib/components/ui/button";
	import {
		Tabs,
		TabsContent,
		TabsList,
		TabsTrigger,
	} from "$lib/components/ui/tabs";
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";
	import { logger } from "$lib/auth/shared/logger";

	let { data } = $props();

	// Add error boundary
	let error = $state<string | null>(null);

	// Check if data is loaded
	$effect(() => {
		logger.debug("Profile page - Data received:", data);
		if (!data) {
			error = "No data received from server";
		} else if (!data.user) {
			error = "No user data found";
		} else if (!data.session) {
			error = "No session data found";
		} else {
			error = null;
		}
	});

	// Now these will work because the server returns user and session
	let session = $derived(data.session);
	let user = $derived(data.user);
	let allSessions = $derived(data?.allSessions || []);

	// Detect if user is logged in via SIWE (Ethereum wallet)
	const isSiweLogin = $derived(
		(user as any)?.lastLoginMethod === "siwe" ||
			(user as any)?.walletAddresses?.length > 0,
	);

	// Debug logging
	$effect(() => {
		logger.debug("Profile page - User data:", {
			user,
			session,
			lastLoginMethod: (user as any)?.lastLoginMethod,
			walletAddresses: (user as any)?.walletAddresses,
			isSiweLogin,
			userKeys: user ? Object.keys(user) : [],
		});
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

<!-- <div class="bg-muted min-h-svh"> -->
<div class="container mx-auto max-w-4xl space-y-6 p-6">
	{#if error}
		<div class="border border-red-200 bg-red-50 p-4 text-red-700">
			<h2 class="font-bold">Profile Page Error</h2>
			<p>{error}</p>
			<p class="text-sm">Check the browser console for more details.</p>
		</div>
	{/if}

	<Tabs value={isSiweLogin ? "wallet" : "general"} class="space-y-4">
		<TabsList>
			{#if isSiweLogin}
				<TabsTrigger value="wallet">Wallet</TabsTrigger>
			{/if}
			<TabsTrigger value="general">General</TabsTrigger>
			<TabsTrigger value="security">Security</TabsTrigger>
			<TabsTrigger value="sessions">Sessions</TabsTrigger>
			<TabsTrigger value="billing">Billing</TabsTrigger>
			<TabsTrigger value="delete">Delete</TabsTrigger>
		</TabsList>

		{#if isSiweLogin}
			<TabsContent value="wallet">
				<SiweTab {user} />
			</TabsContent>
		{/if}

		<TabsContent value="general">
			<GeneralTab
				{user}
				form={data.form}
				{isSocialLoginOnly}
				{isSiweLogin}
			/>
		</TabsContent>

		<TabsContent value="security">
			<SecurityTab {user} {session} form={data.form} {isSiweLogin} />
		</TabsContent>

		<TabsContent value="sessions">
			<SessionsTab {session} {allSessions} />
		</TabsContent>

		<TabsContent value="billing">
			<div class="max-w-md space-y-4">
				<SubscriptionStatus initial={data.subscription} />
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<p class="text-sm font-medium text-gray-700 mb-2">
						Billing
					</p>
					<CustomerPortalButton />
				</div>
			</div>
		</TabsContent>

		<TabsContent value="delete">
			<DeleteTab {user} />
		</TabsContent>
	</Tabs>
</div>
<!-- </div> -->
