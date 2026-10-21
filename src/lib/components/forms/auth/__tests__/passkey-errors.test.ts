import { describe, it, expect } from 'vitest';

import { describePasskeyError, PASSKEY_ERROR_CODES } from '../passkey-errors';

describe('describePasskeyError', () => {
	it('explains a relying party ID mismatch instead of "Auth cancelled"', () => {
		const message = describePasskeyError({
			code: PASSKEY_ERROR_CODES.ERROR_INVALID_RP_ID,
			message: 'Auth cancelled',
			status: 400,
			mode: 'signin'
		});

		expect(message).not.toBe('Auth cancelled');
		expect(message).toContain('PUBLIC_AUTH_PASSKEY_RPID');
	});

	it('reports a dismissed ceremony as cancelled', () => {
		const message = describePasskeyError({
			code: PASSKEY_ERROR_CODES.ERROR_CEREMONY_ABORTED,
			message: 'Auth cancelled',
			status: 400
		});

		expect(message).toContain('dismissed');
	});

	it('maps a known server code even when the status is 404', () => {
		const message = describePasskeyError({
			code: 'PASSKEY_NOT_FOUND',
			message: 'Passkey not found',
			status: 404
		});

		expect(message).toBe('No passkey was found for this account on this device.');
	});

	it('keeps a genuine server message', () => {
		const message = describePasskeyError({
			code: 'SOME_OTHER_CODE',
			message: 'Passkey not found',
			status: 400
		});

		expect(message).toBe('Passkey not found');
	});

	it('falls back to a generic message for the masked generic error', () => {
		const message = describePasskeyError({
			code: PASSKEY_ERROR_CODES.AUTH_CANCELLED,
			message: 'Auth cancelled',
			status: 400,
			mode: 'signin'
		});

		expect(message).toContain('failed');
	});

	it('mentions configuration problems when the endpoint is missing', () => {
		const message = describePasskeyError({ status: 404 });

		expect(message).toContain('configuration');
	});

	it('reports network problems', () => {
		const message = describePasskeyError({ message: 'failed to fetch' });

		expect(message).toContain('Network error');
	});

	it('reports server outages', () => {
		const message = describePasskeyError({ status: 503 });

		expect(message).toContain('temporarily unavailable');
	});
});
