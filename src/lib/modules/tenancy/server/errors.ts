/**
 * Brand access errors (spec §6.3).
 *
 * A single denial type: callers must never be able to distinguish
 * "brand does not exist" from "you may not access this brand".
 */

export class BrandAccessError extends Error {
	readonly code: 'DENIED' | 'INVALID_CONTEXT';

	constructor(message = 'Brand access denied', code: 'DENIED' | 'INVALID_CONTEXT' = 'DENIED') {
		super(message);
		this.name = 'BrandAccessError';
		this.code = code;
	}
}

export function isBrandAccessError(error: unknown): error is BrandAccessError {
	return error instanceof BrandAccessError;
}
