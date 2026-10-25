<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import TwoFactorManager from '../../../two-factor/components/TwoFactorManager.svelte';
	import PasskeyManager from '../../../passkey/components/PasskeyManager.svelte';
	import ConnectedAccounts from '../../../../components/security/ConnectedAccounts.svelte';
	import SiweTab from './SiweTab.svelte';
	import { authClient } from '../../../../client/client.js';
	import { publicEnv } from '#lib/platform/config/index.js';
	import { invalidateAll } from '$app/navigation';
	import type { User, Session } from 'better-auth';

	interface Props {
		user: User & { hasPassword?: boolean; twoFactorEnabled?: boolean; walletAddresses?: unknown[] };
		session: Session;
		accounts?: { id: string; providerId: string }[];
	}
	let { user, accounts = [] }: Props = $props();
	let isVerificationLoading = $state(false);
	let isPasskeyLoading = $state(false);
	let error = $state('');
	let success = $state('');
	const hasPassword = $derived(user.hasPassword === true);
	const hasWallet = $derived((user.walletAddresses?.length ?? 0) > 0);
	const providers = $derived(accounts.filter((account) => !['credential', 'email', 'password'].includes(account.providerId)).map((account) => account.providerId));

	async function handlePasskeySuccess() {
		success = 'Passkey added successfully.';
		await invalidateAll();
	}
	function handlePasskeyError(authError: Error) { error = authError.message; }
	async function sendVerificationEmail() {
		isVerificationLoading = true;
		error = ''; success = '';
		try {
			const response = await authClient.sendVerificationEmail({ email: user.email, callbackURL: '/auth/security' });
			if (response.error) throw new Error(response.error.message || 'Failed to send verification email');
			success = 'Verification email sent. Please check your inbox.';
		} catch (err) { error = err instanceof Error ? err.message : 'Failed to send verification email'; }
		finally { isVerificationLoading = false; }
	}
	async function removePasskey(id: string) {
		isPasskeyLoading = true;
		error = ''; success = '';
		try {
			const response = await authClient.passkey.deletePasskey({ id });
			if (response.error) throw new Error(response.error.message || 'Failed to remove passkey');
			success = 'Passkey removed successfully.';
			await invalidateAll();
		} catch (err) { error = err instanceof Error ? err.message : 'Failed to remove passkey'; }
		finally { isPasskeyLoading = false; }
	}
</script>

<div class="flex flex-col gap-6">
	{#if success}<Alert.Root><Alert.Title>{success}</Alert.Title></Alert.Root>{/if}
	{#if error}<Alert.Root variant="destructive"><Alert.Title>{error}</Alert.Title></Alert.Root>{/if}
	<Card.Root>
		<Card.Header>
			<Card.Title>Email & password</Card.Title>
			<Card.Description>Keep your sign-in details up to date.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				<div><h3 class="font-medium">Password</h3><p class="text-muted-foreground text-sm">{hasPassword ? 'A password is set for this account.' : 'Use an email verification link to create a password.'}</p></div>
				<Button variant="outline" href={hasPassword ? '/auth/change-password' : '/auth/set-password'}>{hasPassword ? 'Change password' : 'Set password'}</Button>
			</div>
			<Separator />
			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				<div><h3 class="font-medium">Email address</h3><p class="text-muted-foreground text-sm">{user.email}</p></div>
				<Button variant="outline" href="/auth/change-email">Change email</Button>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<Badge variant={user.emailVerified ? 'secondary' : 'destructive'}>{user.emailVerified ? 'Email verified' : 'Email not verified'}</Badge>
				{#if !user.emailVerified}<Button variant="outline" onclick={sendVerificationEmail} disabled={isVerificationLoading}>{#if isVerificationLoading}<Spinner />{/if}Send verification email</Button>{/if}
			</div>
		</Card.Content>
	</Card.Root>
	<ConnectedAccounts {accounts} {hasPassword} />
	{#if publicEnv.PUBLIC_AUTH_2FA_PLUGIN}
		{#if hasPassword}
			<TwoFactorManager {user} isOAuthOnly={false} connectedProviders={providers} />
		{:else}
			<Card.Root><Card.Header><Card.Title>Two-factor authentication</Card.Title><Card.Description>A password is required to manage two-factor authentication.</Card.Description></Card.Header><Card.Footer><Button variant="outline" href="/auth/set-password">Set password</Button></Card.Footer></Card.Root>
		{/if}
	{/if}
	{#if publicEnv.PUBLIC_AUTH_PASSKEYS_PLUGIN}
		<PasskeyManager {user} onSuccess={handlePasskeySuccess} onError={handlePasskeyError} onRemove={removePasskey} disabled={isPasskeyLoading} />
	{/if}
	{#if publicEnv.PUBLIC_AUTH_SIWE_PLUGIN && hasWallet}
		<SiweTab {user} />
	{/if}
	<Card.Root>
		<Card.Header><Card.Title>Sessions & devices</Card.Title><Card.Description>Review where you are signed in and manage browser trust.</Card.Description></Card.Header>
		<Card.Footer class="flex flex-wrap gap-3"><Button variant="outline" href="/auth/sessions">Manage sessions</Button>{#if publicEnv.PUBLIC_AUTH_2FA_PLUGIN}<Button variant="outline" href="/auth/trusted-devices">Manage trusted devices</Button>{/if}</Card.Footer>
	</Card.Root>
</div>
