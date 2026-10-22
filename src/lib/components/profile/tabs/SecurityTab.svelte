<!-- src/lib/components/profile/SecurityTab.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Loader, Mail, MonitorSmartphone, Shield } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import TwoFactorManager from '#lib/components/security/two-factor/TwoFactorManager.svelte';
	import PasskeyManager from '#lib/components/security/passkey/PasskeyManager.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { logger, securityLogger } from '#lib/auth/shared/logger.js';
	import type { User, Session } from 'better-auth';
	import { publicEnv } from '#lib/auth/shared/env/index.js';
	interface Props {
		user: User;
		session: Session;
		isSiweLogin?: boolean;
	}

	let { user, session, isSiweLogin = false }: Props = $props();
	let isVerificationLoading = $state(false);
	let isPasskeyLoading = $state(false);
	let error = $state('');
	let success = $state('');
	let twoFactorError = $state('');

	// Detect if user is currently logged in via social login (based on lastLoginMethod)
	// Exclude non-social methods: email, password, credential, siwe, magic-link, otp, passkey
	const isSocialLoginOnly = $derived(
		(user as any)?.lastLoginMethod &&
			(user as any).lastLoginMethod !== 'email' &&
			(user as any).lastLoginMethod !== 'password' &&
			(user as any).lastLoginMethod !== 'credential' &&
			(user as any).lastLoginMethod !== 'siwe' &&
			(user as any).lastLoginMethod !== 'magic-link' &&
			(user as any).lastLoginMethod !== 'otp' &&
			(user as any).lastLoginMethod !== 'passkey'
	);

	// Detect if user logged in via magic link (no password, no social)
	const isMagicLinkLogin = $derived(
		(user as any)?.lastLoginMethod === 'magic-link' ||
			(user as any)?.lastLoginMethod === 'otp'
	);

	// Detect if user has a password (for 2FA eligibility)
	const hasPassword = $derived(
		!!(user as any)?.password ||
			(user as any)?.lastLoginMethod === 'email' ||
			(user as any)?.lastLoginMethod === 'password'
	);

	// 2FA requires password-based auth
	const canEnable2FA = $derived(hasPassword && !isSocialLoginOnly && !isSiweLogin && !isMagicLinkLogin);


	let hasError = $derived(error.length > 0);
	let hasSuccess = $derived(success.length > 0);
	let isAnyLoading = $derived(isVerificationLoading || isPasskeyLoading);

	async function handlePasskeySuccess(result: unknown) {
		logger.info('Passkey added successfully:', result);
		success = 'Passkey added successfully!';

		setTimeout(() => {
			window.location.reload();
		}, 1500);
	}

	function handlePasskeyError(authError: Error) {
		securityLogger.error('Failed to add passkey:', {
			message: authError.message,
			stack: authError.stack
		});
		error = authError.message;
	}

	async function sendVerificationEmail() {
		isVerificationLoading = true;
		error = '';
		success = '';

		try {
			logger.info('Sending verification email');
			const response = await authClient.sendVerificationEmail({
				email: user.email,
				callbackURL: `/auth/verify-email`
			});

			if (response.error) {
				throw new Error(response.error.message || 'Failed to send verification email');
			}

			success = 'Verification email sent! Please check your inbox.';
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email';
			securityLogger.error('Failed to send verification email:', err);
			error = errorMessage;
		} finally {
			isVerificationLoading = false;
		}
	}

	async function removePasskey(passkeyId: string) {
		isPasskeyLoading = true;
		error = '';
		success = '';

		try {
			logger.info('Removing passkey:', { passkeyId });

			const response = await authClient.passkey.deletePasskey({
				id: passkeyId
			});

			if (response.error) {
				throw new Error(response.error.message || 'Failed to remove passkey');
			}

			success = 'Passkey removed successfully!';

			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to remove passkey';
			securityLogger.error('Failed to remove passkey:', err);
			error = errorMessage;
		} finally {
			isPasskeyLoading = false;
		}
	}

</script>

<div class="flex flex-col gap-6">
	<!-- Global Success/Error Messages -->
	{#if hasSuccess}
		<Alert.Root
			variant="default"
			class="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
		>
			<Shield class="h-4 w-4" />
			<Alert.Title>{success}</Alert.Title>
		</Alert.Root>
	{/if}

	{#if hasError}
		<Alert.Root variant="destructive">
			<Alert.Title>{error}</Alert.Title>
		</Alert.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>What protects this account?</Card.Title>
			<Card.Description>Review the recorded settings, then choose the next useful step below.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<dl class="grid gap-3 text-sm sm:grid-cols-2">
				<div><dt class="text-muted-foreground">Email</dt><dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd></div>
				<div><dt class="text-muted-foreground">Two-factor authentication</dt><dd>{typeof (user as User & { twoFactorEnabled?: boolean }).twoFactorEnabled === 'boolean' ? ((user as User & { twoFactorEnabled?: boolean }).twoFactorEnabled ? 'Enabled' : 'Not enabled') : 'Status unavailable'}</dd></div>
			</dl>
			<p class="text-muted-foreground text-sm">{!user.emailVerified && !isSiweLogin && !isSocialLoginOnly ? 'Verify your email below so you can receive account verification messages.' : canEnable2FA && !(user as User & { twoFactorEnabled?: boolean }).twoFactorEnabled ? 'Review two-factor authentication below to add a verification step to sign-in.' : 'Review your active sessions and sign out any you do not recognise.'}</p>
			<Button variant="outline" href="/auth/sessions">Review active sessions</Button>
		</Card.Content>
	</Card.Root>

	<!-- Password & Authentication - Hidden for SIWE and social login users -->
	{#if !isSiweLogin && !isSocialLoginOnly}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Shield class="h-5 w-5" />
					{isMagicLinkLogin ? 'Email & Verification' : 'Password & Authentication'}
				</Card.Title>
				<Card.Description>
					{isMagicLinkLogin
						? 'Manage your email address and verification status.'
						: 'Manage your password and authentication methods.'}
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if hasPassword && !isMagicLinkLogin}
					<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
						<div>
							<h4 class="font-medium">Password</h4>
							<p class="text-muted-foreground text-sm">
								Update your password if it has been shared or exposed
							</p>
						</div>
						<Button variant="outline" onclick={() => goto('/auth/change-password')}>
							Change Password
						</Button>
					</div>
					<Separator />
				{/if}
				<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
					<div>
						<h4 class="font-medium">Email</h4>
						<p class="text-muted-foreground text-sm">
							Keep an address you can access for account messages
						</p>
					</div>
					<Button variant="outline" onclick={() => goto('/auth/change-email')}>Change Email</Button>
				</div>
				<Separator />

				<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
					<div>
						<h4 class="font-medium">Email Verification</h4>
						<p class="text-muted-foreground text-sm">
							{user?.emailVerified ? 'Your email address is verified' : 'Verify your email address'}
						</p>
					</div>
					<Badge variant={user?.emailVerified ? 'success' : 'destructive'}>
						{user?.emailVerified ? 'Verified' : 'Not Verified'}
					</Badge>
				</div>

				{#if !user?.emailVerified}
					<Alert.Root
						variant="default"
						class=" border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
					>
						<Alert.Title class="text-sm text-blue-700 dark:text-blue-200">
							Please verify your email address to secure your account and enable all features.</Alert.Title
						>
					</Alert.Root>

					<Button
						variant="default"
						size="sm"
						onclick={sendVerificationEmail}
						disabled={isVerificationLoading}
					>
						{#if isVerificationLoading}
							<Loader class="h-4 w-4 animate-spin" />
							Sending...
						{:else}
							<Mail class="h-4 w-4" />
							Send Verification Email
						{/if}
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else if isSiweLogin}
		<!-- SIWE users use wallet verification instead -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Shield class="h-5 w-5" />
					Wallet Security
				</Card.Title>
				<Card.Description>Your account is secured by your Ethereum wallet.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div
					class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950"
				>
					<div class="flex items-start gap-3">
						<div class="shrink-0">
							<svg
								class="h-5 w-5 text-green-600 dark:text-green-400"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div>
							<h4 class="font-medium text-green-900 dark:text-green-100">Wallet Verified</h4>
							<p class="mt-1 text-sm text-green-800 dark:text-green-200">
								Your Ethereum wallet provides cryptographic proof of identity. No password needed.
							</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- ✅ TwoFactorManager - Only shown for users with passwords -->
	{#if user && canEnable2FA}
		<TwoFactorManager
			{user}
			isOAuthOnly={isSocialLoginOnly}
			connectedProviders={(user as any)?.connectedProviders || []}
		/>
	{:else if user && !canEnable2FA && !isSocialLoginOnly && !isSiweLogin && !isMagicLinkLogin}
		<div
			class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"
		>
			<div class="flex items-start gap-3">
				<div class="shrink-0">
					<svg
						class="h-5 w-5 text-amber-600 dark:text-amber-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div>
					<h4 class="font-medium text-amber-900 dark:text-amber-100">Set a Password First</h4>
					<p class="mt-1 text-sm text-amber-800 dark:text-amber-200">
						Two-factor authentication requires a password. Please set a password to enable 2FA.
					</p>
					<Button
						variant="outline"
						size="sm"
						class="mt-3"
						onclick={() => goto('/auth/set-password')}
					>
						Set Password
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- PasskeyManager - Only shown for email/password users -->
	{#if publicEnv.PUBLIC_AUTH_PASSKEYS_PLUGIN && user && !isSocialLoginOnly && !isSiweLogin && !isMagicLinkLogin}
		<PasskeyManager
			{user}
			onSuccess={handlePasskeySuccess}
			onError={handlePasskeyError}
			onRemove={removePasskey}
			disabled={isAnyLoading}
		/>
	{/if}

	<!-- Sessions & Devices -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<MonitorSmartphone class="h-5 w-5" />
				Sessions &amp; Devices
			</Card.Title>
			<Card.Description>
				Monitor your login activity, active sessions, and trusted devices.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				<div>
					<h4 class="font-medium">Active Sessions</h4>
					<p class="text-muted-foreground text-sm">
						View and manage where you're signed in
					</p>
				</div>
				<Button variant="outline" onclick={() => goto('/auth/sessions')}>Manage Sessions</Button>
			</div>

			<Separator />

			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				<div>
					<h4 class="font-medium">Trusted Devices</h4>
					<p class="text-muted-foreground text-sm">
						Review trust used to skip a future 2FA prompt; removing trust does not sign out a session
					</p>
				</div>
				<Button variant="outline" onclick={() => goto('/auth/trusted-devices')}>
					Manage Devices
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
