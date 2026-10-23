/**
 * Workspace access errors (spec §6.3).
 *
 * A single denial type: callers must never be able to distinguish
 * "workspace does not exist" from "you may not access this workspace".
 */

export class WorkspaceAccessError extends Error {
	readonly code: 'DENIED' | 'INVALID_CONTEXT';

	constructor(message = 'Workspace access denied', code: 'DENIED' | 'INVALID_CONTEXT' = 'DENIED') {
		super(message);
		this.name = 'WorkspaceAccessError';
		this.code = code;
	}
}

export function isWorkspaceAccessError(error: unknown): error is WorkspaceAccessError {
	return error instanceof WorkspaceAccessError;
}
