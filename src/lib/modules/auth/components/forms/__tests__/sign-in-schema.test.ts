import { describe, it, expect } from 'vitest';
import { signInSchema } from '../schema.js';

/**
 * Sign-in schema unit tests to ensure baseline validation rules are enforced.
 */
describe('signInSchema', () => {
	it('accepts valid credentials', () => {
		const result = signInSchema.safeParse({
			email: 'user@example.com',
			password: 'Validpass1!'
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			expect.fail('Expected valid credentials to pass validation');
		}
	});

	it('rejects missing fields', () => {
		const result = signInSchema.safeParse({});

		expect(result.success).toBe(false);
		if (result.success) {
			expect.fail('Expected empty object to fail validation');
		}

		const issues = result.error.flatten().fieldErrors;
		expect(issues.email?.length).toBeGreaterThan(0);
		expect(issues.password?.length).toBeGreaterThan(0);
	});

	it('rejects invalid email format', () => {
		const result = signInSchema.safeParse({
			email: 'not-an-email',
			password: 'Validpass1!'
		});

		expect(result.success).toBe(false);
		if (result.success) {
			expect.fail('Expected invalid email to fail validation');
		}

		const emailErrors = result.error.flatten().fieldErrors.email ?? [];
		expect(emailErrors.some((message) => message.toLowerCase().includes('email'))).toBe(true);
	});

	it('accepts short passwords so existing accounts are not blocked client-side', () => {
		const result = signInSchema.safeParse({
			email: 'user@example.com',
			password: 'short'
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			expect.fail('Expected short password to pass sign-in validation');
		}
	});
});
