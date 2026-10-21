import { describe, it, expect } from 'vitest';
import { signUpSchema } from '#lib/components/forms/schema.js';

/**
 * These tests cover core validation rules for the sign-up form.
 * They verify that required fields are enforced and that the
 * password confirmation helper rejects mismatched passwords.
 */
describe('signUpSchema', () => {
	it('accepts valid input', () => {
		const result = signUpSchema.safeParse({
			name: 'Jane Doe',
			email: 'jane@example.com',
			password: 'ValidPassword1!',
			passwordConfirm: 'ValidPassword1!'
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			expect.fail('Expected valid input to pass');
		}
	});

	it('fails when required fields are missing', () => {
		const result = signUpSchema.safeParse({});

		expect(result.success).toBe(false);
		if (result.success) {
			expect.fail('Expected empty object to fail validation');
		}

		const issues = result.error.flatten().fieldErrors;
		expect(issues.name?.length).toBeGreaterThan(0);
		expect(issues.email?.length).toBeGreaterThan(0);
		expect(issues.password?.length).toBeGreaterThan(0);
		expect(issues.passwordConfirm?.length).toBeGreaterThan(0);
	});

	it('fails when passwords do not match', () => {
		const result = signUpSchema.safeParse({
			name: 'Jane Doe',
			email: 'jane@example.com',
			password: 'ValidPassword1!',
			passwordConfirm: 'Different1!'
		});

		expect(result.success).toBe(false);
		if (result.success) {
			expect.fail('Expected mismatched passwords to fail validation');
		}

		const fieldErrors = result.error.flatten().fieldErrors;
		expect(fieldErrors.passwordConfirm?.length).toBeGreaterThan(0);
		const mismatchMessage = fieldErrors.passwordConfirm?.find(
			(message) =>
				message.toLowerCase().includes('password') && message.toLowerCase().includes('match')
		);
		expect(mismatchMessage).toBeDefined();
	});

	it('fails when email format is invalid', () => {
		const result = signUpSchema.safeParse({
			name: 'Jane Doe',
			email: 'not-an-email',
			password: 'Validpass1!',
			passwordConfirm: 'Validpass1!'
		});

		expect(result.success).toBe(false);
		if (result.success) {
			expect.fail('Expected invalid email to fail validation');
		}

		const fieldErrors = result.error.flatten().fieldErrors;
		expect(fieldErrors.email?.some((message) => message.toLowerCase().includes('email'))).toBe(
			true
		);
	});

	it('fails when password does not meet strength requirements', () => {
		const result = signUpSchema.safeParse({
			name: 'Jane Doe',
			email: 'jane@example.com',
			password: 'short',
			passwordConfirm: 'short'
		});

		expect(result.success).toBe(false);
		if (result.success) {
			expect.fail('Expected weak password to fail validation');
		}

		const fieldErrors = result.error.flatten().fieldErrors;
		expect(fieldErrors.password?.length).toBeGreaterThan(0);
	});
});
