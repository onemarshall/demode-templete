import { describe, it, expect } from 'vitest';
import { signInSchema } from '#lib/modules/auth/components/forms/schema.js';

describe('SignIn schema', () => {
	const valid = {
		email: 'user@example.com',
		password: 'StrongPass123!',
		rememberMe: true
	};

	it('accepts valid payload', () => {
		const result = signInSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('rejects invalid email with message', () => {
		const result = signInSchema.safeParse({ ...valid, email: 'not-an-email' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((issue) => issue.message);
			expect(messages).toContain('Please enter a valid email address');
		}
	});

	it('requires password', () => {
		const result = signInSchema.safeParse({ ...valid, password: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((issue) => issue.message);
			expect(messages).toContain('Password is required');
		}
	});

	it('strips unexpected fields', () => {
		const result = signInSchema.strip().safeParse({ ...valid, extra: 'not-allowed' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('extra');
			expect(result.data.rememberMe).toBe(true);
		}
	});
});
