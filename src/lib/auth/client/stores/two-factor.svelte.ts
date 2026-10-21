//lib/client/stores/two-factor.svelte.ts
import { authClient } from '$lib/auth-client';
import { toast } from 'svelte-sonner';
import { logger, securityLogger } from '$lib/auth/shared/logger';
import QRCode from 'qrcode';

export function useTwoFactorState(user: typeof authClient.$Infer.Session.user) {
	const twoFactorState = $state<{
		isEnabled: boolean;
		isEnabling: boolean;
		isDisabling: boolean;
		showSetupDialog: boolean;
		showPasswordDialog: boolean;
		showDisableDialog: boolean;
		totpUri: string;
		qrCodeDataUrl: string;
		backupCodes: string[];
		showBackupCodes: boolean;
		step: 'setup' | 'verify' | 'backup';
	}>({
		isEnabled: Boolean(user?.twoFactorEnabled),
		isEnabling: false,
		isDisabling: false,
		showSetupDialog: false,
		showPasswordDialog: false,
		showDisableDialog: false,
		totpUri: '',
		qrCodeDataUrl: '',
		backupCodes: [],
		showBackupCodes: false,
		step: 'setup'
	});

	let error = $state('');

	async function enable2FA(password: string): Promise<void> {
		try {
			twoFactorState.isEnabling = true;
			error = '';

			logger.info('Attempting to enable 2FA');

			const response = await authClient.twoFactor.enable({
				password
			});

			if (response.error) {
				securityLogger.error('Failed to enable 2FA:', response.error);
				throw new Error(response.error.message || 'Failed to enable 2FA');
			}

			if (response.data) {
				if (response.data.method === 'totp') {
					// TOTP setup: show QR code + backup codes
					twoFactorState.totpUri = response.data.totpURI;
					twoFactorState.backupCodes = response.data.backupCodes;
					try {
						twoFactorState.qrCodeDataUrl = await QRCode.toDataURL(response.data.totpURI);
						twoFactorState.showPasswordDialog = false;
						twoFactorState.showSetupDialog = true;
						twoFactorState.step = 'setup';
						logger.info('2FA setup initiated successfully (TOTP)');
					} catch (qrError) {
						logger.error('Failed to generate QR code:', qrError);
						throw new Error('Failed to generate QR code. Please try again.');
					}
				} else {
					// Email OTP setup: the code is delivered to the user's email, no QR code
					twoFactorState.showPasswordDialog = false;
					twoFactorState.showSetupDialog = true;
					twoFactorState.step = 'setup';
					logger.info('2FA setup initiated successfully (email OTP)');
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to enable 2FA';
			securityLogger.error('2FA enable error:', err);
			error = errorMessage;
			toast.error(errorMessage);
		} finally {
			twoFactorState.isEnabling = false;
		}
	}

	async function disable2FA(password: string): Promise<void> {
		try {
			twoFactorState.isDisabling = true;
			error = '';

			logger.info('Attempting to disable 2FA');

			const response = await authClient.twoFactor.disable({
				password
			});

			if (response.error) {
				securityLogger.error('Failed to disable 2FA:', response.error);
				throw new Error(response.error.message || 'Failed to disable 2FA');
			}

			twoFactorState.isEnabled = false;
			twoFactorState.showDisableDialog = false;
			twoFactorState.backupCodes = [];
			twoFactorState.showBackupCodes = false;
			twoFactorState.step = 'setup';
			twoFactorState.totpUri = '';
			twoFactorState.qrCodeDataUrl = '';

			toast.success('Two-factor authentication has been disabled');
			logger.info('2FA disabled successfully');
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA';
			securityLogger.error('2FA disable error:', err);
			error = errorMessage;
			toast.error(errorMessage);
		} finally {
			twoFactorState.isDisabling = false;
		}
	}

	async function generateNewBackupCodes(password: string): Promise<void> {
		try {
			error = '';
			logger.info('Generating new backup codes');

			const response = await authClient.twoFactor.generateBackupCodes({
				password
			});

			if (response.error) {
				securityLogger.error('Failed to generate backup codes:', response.error);
				throw new Error(response.error.message || 'Failed to generate backup codes');
			}

			if (response.data) {
				twoFactorState.backupCodes = response.data.backupCodes;
				twoFactorState.showBackupCodes = true;
				toast.success('New backup codes generated');
				logger.info('Backup codes generated successfully');
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to generate backup codes';
			securityLogger.error('Backup codes generation error:', err);
			error = errorMessage;
			toast.error(errorMessage);
		}
	}

	async function verifyAndComplete(code: string): Promise<void> {
		try {
			error = '';
			logger.info('Attempting to verify TOTP code');

			const response = await authClient.twoFactor.verifyTotp({
				code
			});

			if (response.error) {
				securityLogger.error('Failed to verify 2FA:', response.error);
				error = response.error.message || 'Invalid verification code';
				toast.error(error);
				return;
			}

			twoFactorState.isEnabled = true;
			twoFactorState.step = 'backup';
			toast.success('2FA enabled successfully!');
			logger.info('2FA verification successful');
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
			securityLogger.error('TOTP verification error:', err);
			error = errorMessage;
			toast.error(errorMessage);
		}
	}

	function copyBackupCodes(): void {
		const codesText = twoFactorState.backupCodes.join('\n');
		navigator.clipboard
			.writeText(codesText)
			.then(() => {
				toast.success('Backup codes copied to clipboard');
			})
			.catch(() => {
				toast.error('Failed to copy backup codes');
			});
	}

	function resetState(): void {
		twoFactorState.showSetupDialog = false;
		twoFactorState.showPasswordDialog = false;
		twoFactorState.showDisableDialog = false;
		twoFactorState.showBackupCodes = false;
		twoFactorState.step = 'setup';
		twoFactorState.qrCodeDataUrl = '';
		twoFactorState.totpUri = '';
		error = '';
	}

	function clearError(): void {
		error = '';
	}

	// Auto-clear error messages
	$effect(() => {
		if (error) {
			const timeout = setTimeout(() => {
				error = '';
			}, 5000);
			return () => clearTimeout(timeout);
		}
	});

	// ✅ Fix: Return getters to maintain reactivity
	return {
		// State - return direct references to maintain reactivity
		twoFactorState,

		// ✅ Use getters to access derived state reactively
		get error() {
			return error;
		},
		get hasError() {
			return error.length > 0;
		},
		get isLoading() {
			return twoFactorState.isEnabling || twoFactorState.isDisabling;
		},

		// Actions
		enable2FA,
		disable2FA,
		generateNewBackupCodes,
		verifyAndComplete,
		copyBackupCodes,
		resetState,
		clearError
	};
}
