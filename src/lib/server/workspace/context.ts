/**
 * Shared authorisation service (spec §6.3) — the system's choke point.
 *
 * `requireWorkspaceAccess` resolves and validates, on every protected
 * operation (§6.4 never-cache):
 *   1. the authenticated principal,
 *   2. the workspace's organisation and active resource status,
 *   3. current organisation membership (live read via the version-pinned
 *      adapter),
 *   4. current active, unexpired workspace assignment and effective action
 *      permission (Appendix A matrix),
 *   5. application-grant scope (Phase 3) and entitlement where required (D4).
 *
 * It returns a branded OperationContext. Repositories and downstream
 * services take that context; they never substitute a workspace preference
 * or trust a client-supplied role. Resolution failures deny (fail closed).
 */

import { getDB } from '#lib/auth/server/database/db.js';
import { WorkspaceAccessError } from './errors.js';
import { findMembership } from './better-auth-adapter.js';

export type WorkspaceRole = 'workspace_admin' | 'editor' | 'contributor' | 'viewer';

export type WorkspaceAction =
	| 'workspace:read'
	| 'workspace:update'
	| 'workspace_members:manage'
	| 'audit:read';

/**
 * Appendix A — initial Phase 1 action-permission matrix (proposed).
 * Shipping a different matrix requires a reviewed revision of Appendix A.
 */
export const ACTION_ROLES: Record<WorkspaceAction, readonly WorkspaceRole[]> = {
	'workspace:read': ['workspace_admin', 'editor', 'contributor', 'viewer'],
	'workspace:update': ['workspace_admin'],
	'workspace_members:manage': ['workspace_admin'],
	'audit:read': ['workspace_admin']
};

const operationContextBrand: unique symbol = Symbol('OperationContext');
const issuedContexts = new WeakSet<object>();

export interface OperationContext {
	readonly [operationContextBrand]: true;
	readonly userId: string;
	readonly organisationId: string;
	readonly workspaceId: string;
	readonly workspaceSlug: string;
	readonly workspaceRole: WorkspaceRole;
	readonly authorizedAction: WorkspaceAction;
}

/** Reject objects forged with a TypeScript cast or assembled by callers. */
export function assertOperationContext(ctx: OperationContext): void {
	if (!ctx || typeof ctx !== 'object' || !issuedContexts.has(ctx)) deny();
}

/** Validate runtime provenance and the action bound during resolution. */
export function assertOperationAction(ctx: OperationContext, action: WorkspaceAction): void {
	assertOperationContext(ctx);
	if (ctx.authorizedAction !== action || !ACTION_ROLES[action].includes(ctx.workspaceRole)) deny();
}

export interface WorkspaceRow {
	id: string;
	organisationId: string;
	name: string;
	slug: string;
	createdBy: string;
	status: 'active' | 'archived';
}

export async function findWorkspaceRow(workspaceId: string): Promise<WorkspaceRow | null> {
	const db = await getDB();
	const { rows } = await db.query<WorkspaceRow>(
		`SELECT "id", "organisation_id" AS "organisationId", "name", "slug",
		        "created_by" AS "createdBy", "status"
		 FROM "workspace" WHERE "id" = $1 LIMIT 1`,
		[workspaceId]
	);
	return rows[0] ?? null;
}

function deny(): never {
	throw new WorkspaceAccessError();
}

export async function requireWorkspaceAccess(
	userId: string,
	workspaceId: string,
	action: WorkspaceAction,
	options: { requireEntitlement?: boolean } = {}
): Promise<OperationContext> {
	// 2. Workspace and its organisation; active resource status.
	const workspace = await findWorkspaceRow(workspaceId);
	if (!workspace || workspace.status !== 'active') deny();

	// 3. Current organisation membership — live read, never cached (§6.4).
	const membership = await findMembership(userId, workspace.organisationId);
	if (!membership) deny();

	// 4. Current active, unexpired assignment.
	const assignment = await findActiveAssignment(workspaceId, userId);
	if (!assignment) deny();

	// Effective action permission from the versioned matrix.
	const permitted = ACTION_ROLES[action].includes(assignment.role as WorkspaceRole);
	if (!permitted) deny();

	// 5. Entitlement where the operation requires it (D4). Phase 1 callers
	// omit this; generation (Phase 2+) sets it.
	if (options.requireEntitlement) {
		const { isOrganisationEntitled } = await import('./entitlements.js');
		if (!(await isOrganisationEntitled(workspace.organisationId))) deny();
	}

	const context = Object.freeze({
		[operationContextBrand]: true,
		userId,
		organisationId: workspace.organisationId,
		workspaceId: workspace.id,
		workspaceSlug: workspace.slug,
		workspaceRole: assignment.role as WorkspaceRole,
		authorizedAction: action
	}) as OperationContext;
	issuedContexts.add(context);
	return context;
}

export interface AssignmentRow {
	id: string;
	workspaceId: string;
	userId: string;
	role: string;
	status: 'pending_provisioning' | 'active' | 'revoked' | 'expired';
	expiresAt: Date | null;
	grantSource: string;
	grantedBy: string | null;
	provisioningId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export async function findActiveAssignment(
	workspaceId: string,
	userId: string
): Promise<AssignmentRow | null> {
	const db = await getDB();
	const { rows } = await db.query<AssignmentRow>(
		`SELECT "id", "workspace_id" AS "workspaceId", "user_id" AS "userId", "role",
		        "status", "expires_at" AS "expiresAt", "grant_source" AS "grantSource",
		        "granted_by" AS "grantedBy", "provisioning_id" AS "provisioningId",
		        "created_at" AS "createdAt", "updated_at" AS "updatedAt"
		 FROM "workspace_member"
		 WHERE "workspace_id" = $1 AND "user_id" = $2
		   AND "status" = 'active'
		   AND ("expires_at" IS NULL OR "expires_at" > now())
		 LIMIT 1`,
		[workspaceId, userId]
	);
	return rows[0] ?? null;
}
