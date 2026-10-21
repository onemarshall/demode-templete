// src/lib/config/validation.ts

export const config = {
	name: {
		min: 3,
		max: 50
	},
	password: {
		min: 12,
		max: 128
	}
} as const;

export const validationConfig = config;

export const validationMessages = {
	name: {
		min: `Full name must be at least ${config.name.min} characters`,
		max: `Full name must be less than ${config.name.max} characters`,
		required: 'Full name is required'
	},
	email: {
		invalid: `Please enter a valid email address`,
		required: `Email is required`
	},
	password: {
		min: `Password must be at least ${config.password.min} characters`,
		max: `Password must be less than ${config.password.max} characters`,
		confirm: `Please confirm your password`,
		mismatch: `Passwords do not match`,
		required: `Password is required`
	}
} as const;

// Helper function to replace placeholders in messages
export function formatMessage(message: string, values: Record<string, number | string>): string {
	return message.replace(/\{(\w+)\}/g, (match, key) => {
		return values[key]?.toString() || match;
	});
}
