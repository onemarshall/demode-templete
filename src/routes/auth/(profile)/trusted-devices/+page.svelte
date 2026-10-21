<!-- src/routes/auth/(profile)/trusted-devices/+page.svelte -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Laptop, Shield, CircleCheck, CircleAlert, ArrowLeft, Info } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let isRevoking = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');

	// Auto-clear messages
	$effect(() => {
		if (successMessage || errorMessage) {
			const timeout = setTimeout(() => {
				successMessage = '';
				errorMessage = '';
			}, 5000);
			return () => clearTimeout(timeout);
		}
	});
</script>

<div class="bg-muted min-h-svh">
	<div class="container mx-auto max-w-4xl space-y-6 p-6">
		<!-- Header -->
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" onclick={() => goto('/auth/profile')}>
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-3xl font-bold tracking-tight">Trusted Devices</h1>
					<p class="text-muted-foreground">
						Manage devices that can skip two-factor authentication.
					</p>
				</div>
			</div>
		</div>

		<!-- Success/Error Messages -->
		{#if successMessage}
			<Alert
				class="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
			>
				<CircleCheck class="h-4 w-4" />
				<AlertDescription>{successMessage}</AlertDescription>
			</Alert>
		{/if}

		{#if errorMessage}
			<Alert variant="destructive">
				<CircleAlert class="h-4 w-4" />
				<AlertDescription>{errorMessage}</AlertDescription>
			</Alert>
		{/if}

		<!-- How It Works -->
		<Alert>
			<Info class="h-4 w-4" />
			<AlertDescription>
				When you verify 2FA and choose "Trust this device", the device is remembered for 60 days.
				You won't need to enter a verification code on trusted devices.
			</AlertDescription>
		</Alert>

		<!-- Current Device Status -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Laptop class="h-5 w-5" />
					Current Device
				</Card.Title>
				<Card.Description>
					{data.currentDevice?.browserName || 'Unknown'} on {data.currentDevice?.osName ||
						'Unknown'}
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Shield class="text-muted-foreground h-4 w-4" />
						<span class="text-sm">Trust Status</span>
					</div>
					{#if data.isCurrentDeviceTrusted}
						<Badge variant="success" class="flex items-center gap-1">
							<CircleCheck class="h-3 w-3" />
							Trusted
						</Badge>
					{:else}
						<Badge variant="secondary">Not Trusted</Badge>
					{/if}
				</div>

				{#if data.currentDevice?.ip}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-sm">IP Address</span>
						<span class="font-mono text-sm">{data.currentDevice.ip}</span>
					</div>
				{/if}

				<Separator />

				{#if data.isCurrentDeviceTrusted}
					<div class="space-y-3">
						<p class="text-muted-foreground text-sm">
							This device is trusted and will skip 2FA verification.
						</p>
						<form
							method="POST"
							action="?/revokeCurrentDevice"
							use:enhance={() => {
								isRevoking = true;
								return async ({ result }) => {
									isRevoking = false;
									if (result.type === 'success') {
										successMessage =
											'Device trust revoked. You will need to verify 2FA on next sign-in.';
										await invalidateAll();
									} else if (result.type === 'failure') {
										errorMessage = (result.data?.error as string) || 'Failed to revoke trust';
									}
								};
							}}
						>
							<Button type="submit" variant="destructive" size="sm" disabled={isRevoking}>
								{isRevoking ? 'Revoking...' : 'Revoke Trust'}
							</Button>
						</form>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">
						To trust this device, enable 2FA and select "Trust this device" during verification.
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- 2FA Status -->
		{#if !data.twoFactorEnabled}
			<Card.Root class="border-amber-200 dark:border-amber-800">
				<Card.Header>
					<Card.Title class="text-amber-700 dark:text-amber-300">
						Two-Factor Authentication Required
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground mb-4 text-sm">
						You need to enable two-factor authentication before you can use trusted devices.
					</p>
					<Button onclick={() => goto('/auth/profile')} variant="outline" size="sm">
						Go to Security Settings
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Revoke All Devices -->
		{#if data.twoFactorEnabled}
			<Card.Root>
				<Card.Header>
					<Card.Title>Revoke All Trusted Devices</Card.Title>
					<Card.Description>
						This will require 2FA verification on all your devices, including this one.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/revokeAllDevices"
						use:enhance={() => {
							isRevoking = true;
							return async ({ result }) => {
								isRevoking = false;
								if (result.type === 'success') {
									successMessage = 'All device trusts have been revoked.';
									await invalidateAll();
								} else if (result.type === 'failure') {
									errorMessage = (result.data?.error as string) || 'Failed to revoke all devices';
								}
							};
						}}
					>
						<Button type="submit" variant="outline" size="sm" disabled={isRevoking}>
							Revoke All Devices
						</Button>
					</form>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
