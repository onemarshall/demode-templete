import { z } from 'zod';
import { config, validationMessages } from './config.js';

const { password } = config;
const messages = validationMessages;

// Common validation patterns
const nameRegex = /^[\p{L}\s'-]+$/u;

//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠
// Common Field Definitions
//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠

const commonFields = {
	name: z
		.string({ error: messages.name.required })
		.min(config.name.min, { error: messages.name.min })
		.max(config.name.max, { error: messages.name.max })
		.regex(nameRegex, { error: 'Name contains invalid characters' }),

	email: z.email({ error: messages.email.invalid }),

	password: z
		.string({ error: messages.password.required })
		.min(password.min, { error: messages.password.min })
		.max(password.max, { error: messages.password.max }),

	passwordConfirm: z.string(),

	// Additional common fields
	currentPassword: z.string().min(1, 'Current password is required'),

	newPassword: z
		.string()
		.min(password.min, { error: messages.password.min })
		.max(password.max, { error: messages.password.max })
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		),

	confirmPassword: z.string(),

	code: z.string().regex(/^[0-9]{6}$/, 'Code must be 6 digits'),

	backupCode: z.string().min(8, 'Backup code must be at least 8 characters').optional(),

	trustDevice: z.boolean().default(false)
};

//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠
// Helper Functions
//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠

// Helper function for password confirmation validation
const withPasswordConfirmation = (baseSchema: z.ZodObject) =>
	baseSchema.refine((data) => data.password === data.passwordConfirm, {
		message: messages.password.mismatch,
		path: ['passwordConfirm']
	});

// Helper function for new password confirmation validation
const withNewPasswordConfirmation = (baseSchema: z.ZodObject) =>
	baseSchema.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

// Helper function for two-factor validation
const withTwoFactorValidation = (baseSchema: z.ZodObject) =>
	baseSchema.refine((data) => data.code || data.backupCode, {
		message: 'Either verification code or backup code is required',
		path: ['code']
	});

//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠
// Base Schema
//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠

export const schema = withPasswordConfirmation(
	z.object({
		name: commonFields.name,
		email: commonFields.email,
		password: commonFields.password,
		passwordConfirm: commonFields.passwordConfirm
	})
);

export type Schema = z.infer<typeof schema>;

//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠
// Optimized Form Schemas
//≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠≠

//
// Sign Up Schema
//
export const signUpSchema = withPasswordConfirmation(
	z.object({
		name: commonFields.name,
		email: commonFields.email,
		password: commonFields.password,
		passwordConfirm: commonFields.passwordConfirm
	})
);
export type SignUpSchema = z.infer<typeof signUpSchema>;

//
// Sign In Schema
//
export const signInSchema = z.object({
	email: commonFields.email,
	password: z.string({ error: messages.password.required }).min(1, { error: messages.password.required }),
	rememberMe: z.boolean().default(true)
});
export type SignInSchema = z.infer<typeof signInSchema>;

//
// Email Schema
//
export const emailSchema = z.object({
	email: commonFields.email
});
export type EmailSchema = z.infer<typeof emailSchema>;

//
// Passkey Schema
//
export const passkeySchema = z.object({
	name: z
		.string()
		.min(1, 'Passkey name is required')
		.max(50, 'Name must be less than 50 characters')
});
export type PasskeySchema = z.infer<typeof passkeySchema>;

//
// Password Schema
//
export const passwordSchema = z.object({
	password: commonFields.password
});
export type PasswordSchema = z.infer<typeof passwordSchema>;

//
// Two Factor Verification Schema
//
export const twoFactorVerificationSchema = withTwoFactorValidation(
	z.object({
		code: commonFields.code,
		backupCode: commonFields.backupCode,
		trustDevice: commonFields.trustDevice
	})
);
export type TwoFactorVerificationSchema = z.infer<typeof twoFactorVerificationSchema>;

//
// Profile Schema
//
export const profileSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').optional(),
	email: z.string().email('Please enter a valid email address').optional(),
	image: z.url('Please enter a valid URL').optional()
});
export type ProfileSchema = z.infer<typeof profileSchema>;

//
// Reset Password Schema
//
export const resetPasswordSchema = withNewPasswordConfirmation(
	z.object({
		newPassword: commonFields.newPassword,
		confirmPassword: commonFields.confirmPassword
	})
);
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

//
// Change Password Schema
//
export const changePasswordSchema = withNewPasswordConfirmation(
	z.object({
		currentPassword: commonFields.currentPassword,
		newPassword: commonFields.newPassword,
		confirmPassword: commonFields.confirmPassword
	})
);
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;

//
// Set Password Schema (for users without existing password - e.g., magic link users)
//
export const setPasswordSchema = resetPasswordSchema;
export type SetPasswordSchema = z.infer<typeof setPasswordSchema>;

// Add this to your existing schemas
export const changeEmailSchema = z.object({
	currentEmail: z.string().email('Please enter a valid email address'),
	newEmail: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required')
});

export type ChangeEmailSchema = typeof changeEmailSchema;
