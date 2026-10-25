import { describe, it, expect } from 'vitest';
import { emailSchema } from '#lib/modules/auth/components/forms/schema.js';

describe('ForgotPassword schema (email only)', () => {
	const valid = { email: 'user@example.com' };

	it('accepts valid email', () => {
		const result = emailSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('rejects invalid email with message', () => {
		const result = emailSchema.safeParse({ email: 'invalid-email' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((issue) => issue.message);
			expect(messages).toContain('Please enter a valid email address');
		}
	});

	it('requires email', () => {
		const result = emailSchema.safeParse({ email: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((issue) => issue.message);
			expect(messages).toContain('Please enter a valid email address');
		}
	});

	it('strips unexpected fields', () => {
		const result = emailSchema.strip().safeParse({ ...valid, extra: 'not-allowed' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('extra');
		}
	});
});
