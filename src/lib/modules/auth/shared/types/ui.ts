/**
 * UI State Types
 *
 * Type definitions for UI state management in authentication components.
 */

// ============================================
// Base Types
// ============================================

export interface User {
	id: string;
	email: string;
	name?: string;
	image?: string;
	role?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
	deviceInfo?: string;
	isActive: boolean;
	createdAt: Date;
}

export interface TrustedDevice {
	id: string;
	userId: string;
	name: string;
	deviceId: string;
	userAgent: string;
	ipAddress: string;
	isTrusted: boolean;
	lastSeenAt: Date;
	createdAt: Date;
}

export interface Passkey {
	id: string;
	name: string;
	userId: string;
	deviceId: string;
	userAgent: string;
	ipAddress: string;
	isBackup: boolean;
	transports: string[];
	createdAt: Date;
	lastUsedAt?: Date;
}

export interface SecurityAlert {
	id: string;
	type: 'suspicious_login' | 'failed_attempt' | 'blocked_request' | 'malicious_ip';
	severity: 'low' | 'medium' | 'high' | 'critical';
	title: string;
	description: string;
	ipAddress?: string;
	userAgent?: string;
	isRead: boolean;
	createdAt: Date;
}

export interface SecurityMetrics {
	totalLogins: number;
	failedLogins: number;
	uniqueUsers: number;
	blockedRequests: number;
	suspiciousActivity: number;
	topCountries: Array<{
		country: string;
		count: number;
	}>;
	topIPs: Array<{
		ip: string;
		count: number;
	}>;
	timeSeriesData: Array<{
		timestamp: Date;
		logins: number;
		failures: number;
	}>;
}

// ============================================
// Two-Factor Authentication UI State
// ============================================

export interface TwoFactorState {
	isEnabled: boolean;
	isEnabling: boolean;
	isVerifying: boolean;
	qrCodeDataUrl: string;
	backupCodes: string[];
	showBackupCodes: boolean;
	step: TwoFactorStep;
}

export type TwoFactorStep = 'setup' | 'verify' | 'backup';

// ============================================
// Authentication UI State
// ============================================

export interface AuthState {
	isLoading: boolean;
	isAuthenticated: boolean;
	user: User | null;
	error: string | null;
}

export interface SignInState extends AuthState {
	requiresTwoFactor: boolean;
	twoFactorRedirect?: string;
}

// ============================================
// Form UI State
// ============================================

export interface FormState<T = Record<string, unknown>> {
	data: T;
	errors: Record<string, string>;
	isSubmitting: boolean;
	isDirty: boolean;
	isValid: boolean;
}

export interface AuthFormState extends FormState {
	showPassword: boolean;
	showConfirmPassword: boolean;
}

// ============================================
// Session UI State
// ============================================

export interface SessionListState {
	sessions: Session[];
	isLoading: boolean;
	error: string | null;
	selectedSessionId: string | null;
}

export interface TrustedDevicesState {
	devices: TrustedDevice[];
	isLoading: boolean;
	error: string | null;
}

// ============================================
// Security UI State
// ============================================

export interface SecurityAlertState {
	alerts: SecurityAlert[];
	isLoading: boolean;
	error: string | null;
	unreadCount: number;
}

export interface SecurityMetricsState {
	metrics: SecurityMetrics;
	isLoading: boolean;
	error: string | null;
	timeRange: '24h' | '7d' | '30d' | '90d';
}

// ============================================
// Component Props Types
// ============================================

export interface AuthButtonProps {
	isLoading?: boolean;
	disabled?: boolean;
	variant?: 'primary' | 'secondary' | 'outline';
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

export interface SocialButtonProps extends AuthButtonProps {
	provider: string;
	icon?: string;
	label?: string;
}

export interface PasswordInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	required?: boolean;
	showStrength?: boolean;
	className?: string;
}

export interface TwoFactorInputProps {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	autoFocus?: boolean;
	className?: string;
}
