<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import PageHeader from '#lib/app/shell/page-header.svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let isRevoking = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');

	const submitTrustAction: SubmitFunction = () => {
		isRevoking = true;
		errorMessage = '';
		successMessage = '';
		return async ({ result }) => {
			try {
				if (result.type === 'success' && result.data?.success === true) {
					successMessage = typeof result.data.message === 'string' ? result.data.message : 'Trust was removed from this browser. The current session remains signed in.';
				} else {
					errorMessage = result.type === 'failure' && typeof result.data?.error === 'string' ? result.data.error : 'The request could not be completed. Check your connection and try again.';
				}
				await invalidateAll();
			} catch {
				errorMessage = 'The device view could not be refreshed. Refresh this page before repeating the action.';
			} finally { isRevoking = false; }
		};
	};
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
	<PageHeader title="When will this browser ask for verification?" description="Review the trust setting used to skip a two-factor prompt on a future sign-in." backHref="/auth/sessions" />
	{#if successMessage}<Alert.Root role="status"><Alert.Title>Trust setting updated</Alert.Title><Alert.Description>{successMessage}</Alert.Description></Alert.Root>{/if}
	{#if errorMessage}<Alert.Root variant="destructive"><Alert.Title>Action needs attention</Alert.Title><Alert.Description>{errorMessage}</Alert.Description></Alert.Root>{/if}

	<Alert.Root><Alert.Title>Trust and sign-in are separate</Alert.Title><Alert.Description>Removing this browser's trust means it may need two-factor verification on a future sign-in. It does not sign out the current session. To end an unfamiliar sign-in, use Active sessions.</Alert.Description></Alert.Root>

	<Card.Root>
		<Card.Header><Card.Title>This browser</Card.Title><Card.Description>{data.currentDevice?.browserName || 'Unknown browser'} on {data.currentDevice?.osName || 'unknown device'} · inferred from the browser's reported information</Card.Description></Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-2"><span class="text-sm">Trust cookie</span><Badge variant="secondary">{data.isCurrentDeviceTrusted ? 'Present in this browser' : 'Not detected'}</Badge></div>
			<p class="text-muted-foreground text-sm">Cookie presence alone does not confirm that a trust token is valid or unexpired. Other browsers' trust settings are not listed here.</p>
			{#if data.currentDevice?.ip}<p class="text-muted-foreground break-all text-sm">Current IP: {data.currentDevice.ip}</p>{/if}
			{#if data.isCurrentDeviceTrusted}
				<form method="POST" action="?/revokeCurrentDevice" use:enhance={submitTrustAction}><Button type="submit" variant="outline" size="sm" disabled={isRevoking}>{isRevoking ? 'Updating…' : 'Remove trust from this browser'}</Button></form>
			{:else}<p class="text-muted-foreground text-sm">If two-factor authentication is enabled, you can choose to trust this browser when you complete verification.</p>{/if}
		</Card.Content>
	</Card.Root>

	{#if !data.twoFactorEnabled}
		<Card.Root><Card.Header><Card.Title>Two-factor authentication is not enabled</Card.Title><Card.Description>Trusted-device settings apply when two-factor authentication is enabled for your account.</Card.Description></Card.Header><Card.Content><Button href="/auth/security" variant="outline" size="sm">Review account protection</Button></Card.Content></Card.Root>
	{:else}
		<Card.Root>
			<Card.Header><Card.Title>Need to end other sign-ins too?</Card.Title><Card.Description>Remove trust from this browser and sign out other active sessions. Trust cookies stored in other browsers remain unchanged.</Card.Description></Card.Header>
			<Card.Content>
				<details>
					<summary class="cursor-pointer text-sm">Review and confirm…</summary>
					<p class="text-muted-foreground my-3 text-sm">You stay signed in here. Other sessions will need to sign in again.</p>
					<form method="POST" action="?/revokeAllDevices" use:enhance={submitTrustAction}><Button type="submit" variant="destructive" size="sm" disabled={isRevoking}>{isRevoking ? 'Updating…' : 'Remove trust here and sign out other sessions'}</Button></form>
				</details>
			</Card.Content>
		</Card.Root>
	{/if}
	<div class="flex flex-wrap gap-2"><Button href="/auth/sessions" variant="outline">Review active sessions</Button><Button href="/auth/security" variant="ghost">Account protection</Button></div>
</div>
