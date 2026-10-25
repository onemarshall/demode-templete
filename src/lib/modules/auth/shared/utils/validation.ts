/**
 * Validation Utilities
 *
 * Common validation schemas and functions.
 */

import * as z from 'zod';

// ============================================
// Common Validation Schemas
// ============================================

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validation
 */
export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number')
	.regex(/[!@#$%^&*]/, 'Password must contain at least one special character');

/**
 * Username validation
 */
export const usernameSchema = z
	.string()
	.min(3, 'Username must be at least 3 characters')
	.max(30, 'Username must be less than 30 characters')
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		'Username can only contain letters, numbers, underscores, and hyphens'
	);

/**
 * Phone number validation
 */
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Token validation (for verification codes, etc.)
 */
export const tokenSchema = z
	.string()
	.min(6, 'Token must be at least 6 characters')
	.max(128, 'Token too long')
	.regex(/^[a-zA-Z0-9]+$/, 'Token can only contain letters and numbers');

// ============================================
// Auth-Specific Schemas
// ============================================

/**
 * Sign in form validation
 */
export const signInSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required'),
	remember: z.boolean().optional().default(false)
});

/**
 * Sign up form validation
 */
export const signUpSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, 'Please confirm your password'),
		name: usernameSchema,
		acceptTerms: z
			.boolean()
			.refine((val) => val === true, 'You must accept the terms and conditions')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});

/**
 * Password reset request validation
 */
export const passwordResetRequestSchema = z.object({
	email: emailSchema
});

/**
 * Password reset confirmation validation
 */
export const passwordResetConfirmSchema = z
	.object({
		token: tokenSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, 'Please confirm your password')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});

/**
 * Email verification validation
 */
export const emailVerificationSchema = z.object({
	token: tokenSchema
});

/**
 * Two-factor authentication validation
 */
export const twoFactorSchema = z.object({
	code: z
		.string()
		.length(6, 'Code must be exactly 6 digits')
		.regex(/^\d+$/, 'Code must contain only numbers'),
	trustDevice: z.boolean().optional().default(false)
});

/**
 * Magic link request validation
 */
export const magicLinkRequestSchema = z.object({
	email: emailSchema,
	callbackURL: urlSchema.optional()
});

/**
 * Social provider validation
 */
export const socialProviderSchema = z.enum(['github', 'google', 'discord', 'linkedin', 'twitter']);

/**
 * Session management validation
 */
export const sessionSchema = z.object({
	sessionId: z.string().min(1, 'Session ID is required')
});

// ============================================
// Utility Functions
// ============================================

/**
 * Validate and sanitize input
 */
export function validateAndSanitize<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
	try {
		const validated = schema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors = error.issues.map((err) => err.message);
			return { success: false, errors };
		}
		return { success: false, errors: ['Validation failed'] };
	}
}

/**
 * Check if string is potentially dangerous (XSS protection)
 */
export function isSafeString(input: string): boolean {
	const dangerousPatterns = [
		/<script/i,
		/javascript:/i,
		/on\w+\s*=/i,
		/<iframe/i,
		/<object/i,
		/<embed/i
	];

	return !dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(input: string): string {
	return input
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}

/**
 * Validate file upload
 */
export function validateFileUpload(
	file: File,
	options: {
		maxSize?: number; // in bytes
		allowedTypes?: string[];
		maxFileNameLength?: number;
	} = {}
): { valid: boolean; error?: string } {
	const {
		maxSize = 5 * 1024 * 1024, // 5MB default
		allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
		maxFileNameLength = 255
	} = options;

	if (file.size > maxSize) {
		return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
	}

	if (!allowedTypes.includes(file.type)) {
		return { valid: false, error: 'File type not allowed' };
	}

	if (file.name.length > maxFileNameLength) {
		return { valid: false, error: 'File name too long' };
	}

	// Check for dangerous file extensions
	const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
	const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

	if (dangerousExtensions.includes(extension)) {
		return { valid: false, error: 'File type not allowed' };
	}

	return { valid: true };
}
