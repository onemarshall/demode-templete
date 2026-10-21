import { describe, it, expect } from 'vitest';
import { changeEmailSchema } from '$lib/components/forms/schema';

describe('ChangeEmail schema', () => {
	const valid = {
		currentEmail: 'current@example.com',
		newEmail: 'new@example.com',
		password: 'StrongPass123!'
	};

	it('accepts valid payload', () => {
		const result = changeEmailSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('rejects invalid emails with message', () => {
		const result = changeEmailSchema.safeParse({
			...valid,
			currentEmail: 'bad',
			newEmail: 'also-bad'
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((issue) => issue.message);
			expect(messages).toContain('Please enter a valid email address');
		}
	});

	it('requires password', () => {
		const result = changeEmailSchema.safeParse({
			...valid,
			password: ''
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe('Password is required');
		}
	});

	it('leaves no extra fields', () => {
		const result = changeEmailSchema.strip().safeParse({
			...valid,
			extra: 'not-allowed'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('extra');
		}
	});
});
