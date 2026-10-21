/**
 * Form Data Types
 *
 * Type definitions for authentication forms.
 * These are used throughout the application for form validation.
 */

// ============================================
// Basic Form Types
// ============================================

export interface PasswordFormData {
	password: string;
}

export interface TwoFactorVerificationFormData {
	code: string;
}

export interface SignUpFormData {
	email: string;
	password: string;
	name?: string;
	confirmPassword?: string;
}

export interface SignInFormData {
	email: string;
	password: string;
	rememberMe?: boolean;
}

// ============================================
// 2FA Form Types
// ============================================

export interface TwoFactorEnableFormData {
	password: string;
}

export interface TwoFactorVerifyFormData {
	code: string;
	trustDevice?: boolean;
}

export interface BackupCodeVerifyFormData {
	code: string;
	trustDevice?: boolean;
}

// ============================================
// Password Reset Forms
// ============================================

export interface ForgotPasswordFormData {
	email: string;
	redirectTo?: string;
}

export interface ResetPasswordFormData {
	token: string;
	newPassword: string;
	confirmPassword: string;
}

// ============================================
// Email Verification Forms
// ============================================

export interface ResendVerificationFormData {
	email: string;
	callbackURL?: string;
}

export interface VerifyEmailFormData {
	token: string;
}

// ============================================
// Social Auth Forms
// ============================================

export interface SocialSignInFormData {
	providerId: string;
	callbackURL?: string;
}

export interface UnlinkSocialProviderFormData {
	providerId: string;
	accountId?: string;
}

// ============================================
// Profile Management Forms
// ============================================

export interface UpdateProfileFormData {
	name?: string;
	image?: string;
}

export interface ChangePasswordFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface DeleteAccountFormData {
	password: string;
	confirmation: string;
}
