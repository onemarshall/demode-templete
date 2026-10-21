<!-- src/lib/components/profile/security/TwoFactorManager/TwoFactorManager.svelte -->
<script lang="ts">
	import { dev } from "$app/env";
	import TwoFactorStatusCard from "$lib/components/security/two-factor/StatusCard.svelte";
	import PasswordConfirmationDialog from "$lib/components/security/two-factor/PasswordConfirmationDialog.svelte";
	import QRCodeSetupDialog from "$lib/components/security/two-factor/QRCodeSetupDialog.svelte";
	import BackupCodesDialog from "$lib/components/security/two-factor/BackupCodesDialog.svelte";

	import { useTwoFactorState } from "$lib/auth/client/stores/two-factor.svelte";
	import { authClient } from "$lib/auth-client";
	import { logger } from "$lib/auth/shared/logger";
	import type { User } from "better-auth";

	type TwoFactorUser = typeof authClient.$Infer.Session.user;

	interface Props {
		user: User;
		isOAuthOnly?: boolean;
		connectedProviders?: string[];
	}

	let {
		user,
		isOAuthOnly = false,
		connectedProviders = [],
	}: Props = $props();

	// Determine if 2FA should be available
	const shouldShow2FA = $derived(!isOAuthOnly);

	// Debug logging only in development
	$effect(() => {
		if (dev) {
			logger.debug("[TwoFactorManager] User:", user?.id);
			logger.debug("[TwoFactorManager] 2FA available:", shouldShow2FA);
		}
	});

	function toTwoFactorUser(u: Partial<TwoFactorUser>): TwoFactorUser {
		return {
			...u,
			id: u.id ?? "",
			createdAt: u.createdAt ?? new Date(0),
			updatedAt: u.updatedAt ?? new Date(0),
			email: u.email ?? "",
			emailVerified: u.emailVerified ?? false,
			name: u.name ?? "",
			image: u.image ?? null,
			twoFactorEnabled: u.twoFactorEnabled ?? false,
		} as TwoFactorUser;
	}

	// Reactively transform user to TwoFactorUser
	const twoFactorUser = $derived(
		toTwoFactorUser(user as Partial<TwoFactorUser>),
	);

	// Store instance - initialized lazily in $effect.pre
	let twoFactorApi = $state<ReturnType<typeof useTwoFactorState> | null>(
		null,
	);
	let currentUserId = $state("");

	// Initialize and reinitialize store when user identity changes
	$effect.pre(() => {
		const userId = twoFactorUser.id;
		const enabled = twoFactorUser.twoFactorEnabled;

		if (userId !== currentUserId) {
			// User changed - create new store instance
			currentUserId = userId;
			twoFactorApi = useTwoFactorState(twoFactorUser);
		} else if (
			twoFactorApi &&
			twoFactorApi.twoFactorState.isEnabled !== enabled
		) {
			// Same user, but 2FA status changed - sync it
			twoFactorApi.twoFactorState.isEnabled = enabled ?? false;
		}
	});

	// Local state for backup codes password dialog
	let showBackupPasswordDialog = $state(false);
	let isGeneratingBackupCodes = $state(false);

	function handleEnableClick() {
		if (twoFactorApi) twoFactorApi.twoFactorState.showPasswordDialog = true;
	}

	function handleDisableClick() {
		if (twoFactorApi) twoFactorApi.twoFactorState.showDisableDialog = true;
	}

	function handleGenerateBackupCodes() {
		showBackupPasswordDialog = true;
	}

	async function handleBackupCodesPassword(password: string) {
		if (!twoFactorApi) return;
		isGeneratingBackupCodes = true;
		try {
			await twoFactorApi.generateNewBackupCodes(password);
			showBackupPasswordDialog = false;
		} finally {
			isGeneratingBackupCodes = false;
		}
	}

	function handleBackupCodesCancel() {
		showBackupPasswordDialog = false;
	}

	function handleBackupCodesClose() {
		if (twoFactorApi) twoFactorApi.twoFactorState.showBackupCodes = false;
	}

	function handleDisableCancel() {
		if (twoFactorApi) twoFactorApi.twoFactorState.showDisableDialog = false;
	}

	function formatProviderList(providers: string[]): string {
		if (!providers || providers.length === 0) return "your social provider";
		if (providers.length === 1)
			return providers[0] ?? "your social provider";
		if (providers.length === 2)
			return `${providers[0]} and ${providers[1]}`;
		const last = providers[providers.length - 1] ?? "";
		const rest = providers.slice(0, -1);
		return `${rest.join(", ")}, and ${last}`;
	}
</script>

{#if shouldShow2FA && twoFactorApi}
	<div class="two-factor-manager space-y-4">
		<!-- Error display -->
		{#if twoFactorApi.hasError && twoFactorApi.error}
			<div
				class="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
				role="alert"
			>
				<div class="flex items-start gap-2">
					<svg
						class="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
						fill="currentColor"
						viewBox="0 0 20 20"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
					<p class="text-sm text-red-700 dark:text-red-200">
						{twoFactorApi.error}
					</p>
				</div>
			</div>
		{/if}

		<!-- Status Card -->
		<TwoFactorStatusCard
			twoFactorState={twoFactorApi.twoFactorState}
			onEnable={handleEnableClick}
			onDisable={handleDisableClick}
			onGenerateBackupCodes={handleGenerateBackupCodes}
		/>

		<!-- Enable 2FA: Password Confirmation -->
		<PasswordConfirmationDialog
			open={twoFactorApi.twoFactorState.showPasswordDialog}
			title="Enable Two-Factor Authentication"
			description="Enter your password to enable 2FA for your account."
			isLoading={twoFactorApi.twoFactorState.isEnabling}
			onConfirm={twoFactorApi.enable2FA}
			onCancel={twoFactorApi.resetState}
		/>

		<!-- QR Code Setup -->
		<QRCodeSetupDialog
			open={twoFactorApi.twoFactorState.showSetupDialog}
			twoFactorState={twoFactorApi.twoFactorState}
			onComplete={twoFactorApi.resetState}
			onVerifyCode={twoFactorApi.verifyAndComplete}
			onCopyBackupCodes={twoFactorApi.copyBackupCodes}
		/>

		<!-- View Backup Codes -->
		<BackupCodesDialog
			open={twoFactorApi.twoFactorState.showBackupCodes}
			codes={twoFactorApi.twoFactorState.backupCodes}
			onClose={handleBackupCodesClose}
		/>

		<!-- Disable 2FA: Password Confirmation -->
		<PasswordConfirmationDialog
			open={twoFactorApi.twoFactorState.showDisableDialog}
			title="Disable Two-Factor Authentication"
			description="Enter your password to disable 2FA. This will make your account less secure."
			isLoading={twoFactorApi.twoFactorState.isDisabling}
			buttonText="Disable 2FA"
			buttonVariant="destructive"
			onConfirm={twoFactorApi.disable2FA}
			onCancel={handleDisableCancel}
		/>

		<!-- Generate New Backup Codes: Password Confirmation -->
		<PasswordConfirmationDialog
			open={showBackupPasswordDialog}
			title="Generate New Backup Codes"
			description="Enter your password to generate new backup codes. This will invalidate your existing codes."
			isLoading={isGeneratingBackupCodes}
			buttonText="Generate Codes"
			onConfirm={handleBackupCodesPassword}
			onCancel={handleBackupCodesCancel}
		/>
	</div>
{:else if shouldShow2FA && !twoFactorApi}
	<!-- Loading state while store initializes -->
	<div class="animate-pulse space-y-4">
		<div class="h-32 rounded-lg bg-gray-200 dark:bg-gray-800"></div>
	</div>
{:else}
	<!-- OAuth-only users info panel -->
	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950"
		role="status"
	>
		<div class="flex items-start gap-3">
			<div class="shrink-0">
				<svg
					class="h-5 w-5 text-blue-600 dark:text-blue-400"
					fill="currentColor"
					viewBox="0 0 20 20"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="space-y-2">
				<h4 class="font-medium text-blue-900 dark:text-blue-100">
					Two-Factor Authentication
				</h4>
				<p class="text-sm text-blue-800 dark:text-blue-200">
					Two-factor authentication is not available for social login
					accounts. Your account is secured by {formatProviderList(
						connectedProviders,
					)}.
				</p>
				<p class="text-xs text-blue-700 dark:text-blue-300">
					To enable 2FA, add an email and password to your account.
				</p>
			</div>
		</div>
	</div>
{/if}
