import { describe, it, expect } from 'vitest';
import { changePasswordSchema } from '#lib/components/forms/schema.js';

describe('ChangePassword schema', () => {
	const valid = {
		currentPassword: 'OldPass123!',
		newPassword: 'NewPassword123!',
		confirmPassword: 'NewPassword123!'
	};

	it('accepts valid payload', () => {
		const result = changePasswordSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('requires matching confirm password with message "Passwords don\'t match"', () => {
		const result = changePasswordSchema.safeParse({
			...valid,
			confirmPassword: 'Mismatch123!'
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((issue) => issue.message);
			expect(messages).toContain("Passwords don't match");
		}
	});

	it('requires current password', () => {
		const result = changePasswordSchema.safeParse({
			...valid,
			currentPassword: ''
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe('Current password is required');
		}
	});

	it('enforces new password strength and length', () => {
		const weak = changePasswordSchema.safeParse({
			...valid,
			newPassword: 'short',
			confirmPassword: 'short'
		});
		expect(weak.success).toBe(false);
		if (!weak.success) {
			const messages = weak.error.issues.map((issue) => issue.message);
			expect(messages).toContain('Password must be at least 12 characters');
		}

		const missingCase = changePasswordSchema.safeParse({
			...valid,
			newPassword: 'alllowercase1',
			confirmPassword: 'alllowercase1'
		});
		expect(missingCase.success).toBe(false);
		if (!missingCase.success) {
			const messages = missingCase.error.issues.map((issue) => issue.message);
			expect(messages).toContain(
				'Password must contain at least one uppercase letter, one lowercase letter, and one number'
			);
		}
	});

	it('strips unexpected fields', () => {
		const result = changePasswordSchema.strip().safeParse({
			...valid,
			extra: 'not-allowed'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('extra');
		}
	});
});
