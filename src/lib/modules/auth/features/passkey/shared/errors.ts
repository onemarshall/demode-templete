/**
 * Passkey Error Mapping
 *
 * Better Auth's passkey client replaces the original WebAuthn error message
 * with a generic "Auth cancelled" for the sign-in flow and only keeps the
 * machine readable `code` (e.g. `ERROR_INVALID_RP_ID`). The code is the only
 * actionable signal, so it has to be mapped back to a useful message.
 */

/** WebAuthn / simplewebauthn error codes relevant to the passkey ceremonies. */
export const PASSKEY_ERROR_CODES = {
	AUTH_CANCELLED: 'AUTH_CANCELLED',
	ERROR_CEREMONY_ABORTED: 'ERROR_CEREMONY_ABORTED',
	ERROR_INVALID_RP_ID: 'ERROR_INVALID_RP_ID',
	ERROR_INVALID_DOMAIN: 'ERROR_INVALID_DOMAIN',
	ERROR_MALFORMED_PUBKEYCREDPARAMS: 'ERROR_MALFORMED_PUBKEYCREDPARAMS',
	ERROR_AUTHENTICATOR_GENERAL_ERROR: 'ERROR_AUTHENTICATOR_GENERAL_ERROR',
	ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT:
		'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT',
	ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT:
		'ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT',
	ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED:
		'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
	ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG:
		'ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG',
	ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE:
		'ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE',
	ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY'
} as const;

export type PasskeyErrorCode =
	(typeof PASSKEY_ERROR_CODES)[keyof typeof PASSKEY_ERROR_CODES];

export type PasskeyMode = 'signin' | 'add';

export interface PasskeyFailure {
	/** Machine readable error code, e.g. `ERROR_INVALID_RP_ID`. */
	code?: string | null;
	/** Message returned by Better Auth. */
	message?: string | null;
	/** HTTP status of the failing request. */
	status?: number | null;
	/** The ceremony that failed. */
	mode?: PasskeyMode;
}

const MESSAGES: Record<string, string> = {
	[PASSKEY_ERROR_CODES.ERROR_INVALID_RP_ID]:
		'This site’s passkey domain does not match the address you are using. ' +
		'Open the site from its public address, or set PUBLIC_AUTH_PASSKEY_RPID to match it.',
	[PASSKEY_ERROR_CODES.ERROR_INVALID_DOMAIN]:
		'The address you are using is not valid for passkeys on this site.',
	[PASSKEY_ERROR_CODES.ERROR_CEREMONY_ABORTED]:
		'The passkey prompt was dismissed before it finished.',
	[PASSKEY_ERROR_CODES.ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED]:
		'A passkey for this account already exists on this device.',
	[PASSKEY_ERROR_CODES.ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT]:
		'No passkey was found for this account on this device.',
	[PASSKEY_ERROR_CODES.ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT]:
		'This device cannot verify your identity for passkeys.',
	[PASSKEY_ERROR_CODES.ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG]:
		'This device does not support the encryption this site requires.',
	[PASSKEY_ERROR_CODES.ERROR_AUTHENTICATOR_GENERAL_ERROR]:
		'The authenticator reported an error while creating the passkey.',
	[PASSKEY_ERROR_CODES.ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE]:
		'The authenticator could not verify your identity automatically.',
	[PASSKEY_ERROR_CODES.ERROR_MALFORMED_PUBKEYCREDPARAMS]:
		'The passkey request was malformed and could not be processed.',
	[PASSKEY_ERROR_CODES.ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY]:
		'The passkey request was rejected by the browser.',
	// Better Auth server side codes
	PASSKEY_NOT_FOUND: 'No passkey was found for this account on this device.',
	AUTHENTICATION_FAILED: 'The passkey could not be verified. Please try again.',
	CHALLENGE_NOT_FOUND:
		'The passkey request expired before it was completed. Please try again.',
	FAILED_TO_VERIFY_AUTHENTICATION:
		'The passkey response could not be verified. Please try again.',
	UNABLE_TO_CREATE_SESSION:
		'The passkey was verified but the session could not be created.'
};

/**
 * Build a user facing message for a failed passkey ceremony.
 */
export function describePasskeyError(failure: PasskeyFailure): string {
	const { code, message, status, mode = 'signin' } = failure;

	if (code && MESSAGES[code]) {
		return MESSAGES[code];
	}

	// A 404 without a more specific code means the endpoint itself is missing.
	if (status === 404) {
		return 'Passkey service not available. Please check your configuration.';
	}

	if (status !== undefined && status !== null && status >= 500) {
		return 'The passkey service is temporarily unavailable. Please try again.';
	}

	if (message) {
		if (message.includes('fetch') || message.includes('network')) {
			return 'Network error. Please check your connection and try again.';
		}

		// Better Auth reports a cancelled ceremony with this generic message.
		if (message !== 'Auth cancelled') {
			return message;
		}
	}

	return mode === 'add'
		? 'Adding the passkey failed. Please try again.'
		: 'Sign-in with the passkey failed. Please try again.';
}
