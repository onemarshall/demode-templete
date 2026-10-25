export type AuthFieldIssue = {
	message: string;
};

// ================================
// Email Validation
// ================================

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function shouldValidateEmailOnInput(value: string): boolean {
	const normalized = value.trim();
	return normalized.length >= 3 && normalized.includes('@');
}

export function getEmailIssues(value: string): AuthFieldIssue[] {
	const normalized = value.trim();
	if (normalized.length === 0 || emailPattern.test(normalized)) {
		return [];
	}

	return [{ message: 'Please enter a valid email address' }];
}

// ================================
// Password Validation
// ================================

const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export interface PasswordValidationOptions {
	/** Minimum length (default: 12) */
	min?: number;
	/** Whether to check complexity (uppercase, lowercase, number). Default: true */
	checkComplexity?: boolean;
}

/** Start validating password on input once user has typed a few characters */
export function shouldValidatePasswordOnInput(value: string): boolean {
	return value.length >= 3;
}

/** Get validation issues for a password field */
export function getPasswordIssues(
	value: string,
	opts?: PasswordValidationOptions
): AuthFieldIssue[] {
	if (value.length === 0) return [];

	const min = opts?.min ?? PASSWORD_MIN;
	const checkComplexity = opts?.checkComplexity ?? true;
	const issues: AuthFieldIssue[] = [];

	if (value.length < min) {
		issues.push({ message: `Password must be at least ${min} characters` });
	} else if (value.length > PASSWORD_MAX) {
		issues.push({ message: `Password must be less than ${PASSWORD_MAX} characters` });
	}

	if (checkComplexity && value.length >= min && !PASSWORD_COMPLEXITY.test(value)) {
		issues.push({
			message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		});
	}

	return issues;
}

/** Get validation issues for a confirm password field */
export function getConfirmPasswordIssues(
	password: string,
	confirmPassword: string
): AuthFieldIssue[] {
	if (confirmPassword.length === 0) return [];
	if (password !== confirmPassword) {
		return [{ message: 'Passwords do not match' }];
	}
	return [];
}
