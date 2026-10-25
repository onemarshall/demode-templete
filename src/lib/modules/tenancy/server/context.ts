/**
 * Shared authorisation service (spec §6.3) — the system's choke point.
 *
 * `requireBrandAccess` resolves and validates, on every protected
 * operation (§6.4 never-cache):
 *   1. the authenticated principal,
 *   2. the brand's organisation and active resource status,
 *   3. current organisation membership (live read via the version-pinned
 *      adapter),
 *   4. current active, unexpired brand assignment and effective action
 *      permission (Appendix A matrix),
 *   5. application-grant scope (Phase 3) and entitlement where required (D4).
 *
 * It returns a branded OperationContext. Repositories and downstream
 * services take that context; they never substitute a brand preference
 * or trust a client-supplied role. Resolution failures deny (fail closed).
 */

import { getDB } from '#lib/platform/database/db.js';
import { BrandAccessError } from './errors.js';
import { findMembership } from './better-auth-adapter.js';

export type BrandRole = 'brand_admin' | 'editor' | 'contributor' | 'viewer';

export type BrandAction =
	| 'brand:read'
	| 'brand:update'
	| 'brand_members:manage'
	| 'audit:read';

/**
 * Appendix A — initial Phase 1 action-permission matrix (proposed).
 * Shipping a different matrix requires a reviewed revision of Appendix A.
 */
export const ACTION_ROLES: Record<BrandAction, readonly BrandRole[]> = {
	'brand:read': ['brand_admin', 'editor', 'contributor', 'viewer'],
	'brand:update': ['brand_admin'],
	'brand_members:manage': ['brand_admin'],
	'audit:read': ['brand_admin']
};

const operationContextBrand: unique symbol = Symbol('OperationContext');
const issuedContexts = new WeakSet<object>();

export interface OperationContext {
	readonly [operationContextBrand]: true;
	readonly userId: string;
	readonly organisationId: string;
	readonly brandId: string;
	readonly brandSlug: string;
	readonly brandRole: BrandRole;
	readonly authorizedAction: BrandAction;
}

/** Reject objects forged with a TypeScript cast or assembled by callers. */
export function assertOperationContext(ctx: OperationContext): void {
	if (!ctx || typeof ctx !== 'object' || !issuedContexts.has(ctx)) deny();
}

/** Validate runtime provenance and the action bound during resolution. */
export function assertOperationAction(ctx: OperationContext, action: BrandAction): void {
	assertOperationContext(ctx);
	if (ctx.authorizedAction !== action || !ACTION_ROLES[action].includes(ctx.brandRole)) deny();
}

export interface BrandRow {
	id: string;
	organisationId: string;
	name: string;
	slug: string;
	createdBy: string;
	status: 'active' | 'archived';
}

export async function findBrandRow(brandId: string): Promise<BrandRow | null> {
	const db = await getDB();
	const { rows } = await db.query<BrandRow>(
		`SELECT "id", "organisation_id" AS "organisationId", "name", "slug",
		        "created_by" AS "createdBy", "status"
		 FROM "brand" WHERE "id" = $1 LIMIT 1`,
		[brandId]
	);
	return rows[0] ?? null;
}

function deny(): never {
	throw new BrandAccessError();
}

export async function requireBrandAccess(
	userId: string,
	brandId: string,
	action: BrandAction,
	options: { requireEntitlement?: boolean } = {}
): Promise<OperationContext> {
	// 2. Brand and its organisation; active resource status.
	const brand = await findBrandRow(brandId);
	if (!brand || brand.status !== 'active') deny();

	// 3. Current organisation membership — live read, never cached (§6.4).
	const membership = await findMembership(userId, brand.organisationId);
	if (!membership) deny();

	// 4. Current active, unexpired assignment.
	const assignment = await findActiveAssignment(brandId, userId);
	if (!assignment) deny();

	// Effective action permission from the versioned matrix.
	const permitted = ACTION_ROLES[action].includes(assignment.role as BrandRole);
	if (!permitted) deny();

	// 5. Entitlement where the operation requires it (D4). Phase 1 callers
	// omit this; generation (Phase 2+) sets it.
	if (options.requireEntitlement) {
		const { isOrganisationEntitled } = await import('./entitlements.js');
		if (!(await isOrganisationEntitled(brand.organisationId))) deny();
	}

	const context = Object.freeze({
		[operationContextBrand]: true,
		userId,
		organisationId: brand.organisationId,
		brandId: brand.id,
		brandSlug: brand.slug,
		brandRole: assignment.role as BrandRole,
		authorizedAction: action
	}) as OperationContext;
	issuedContexts.add(context);
	return context;
}

export interface AssignmentRow {
	id: string;
	brandId: string;
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
	brandId: string,
	userId: string
): Promise<AssignmentRow | null> {
	const db = await getDB();
	const { rows } = await db.query<AssignmentRow>(
		`SELECT "id", "brand_id" AS "brandId", "user_id" AS "userId", "role",
		        "status", "expires_at" AS "expiresAt", "grant_source" AS "grantSource",
		        "granted_by" AS "grantedBy", "provisioning_id" AS "provisioningId",
		        "created_at" AS "createdAt", "updated_at" AS "updatedAt"
		 FROM "brand_member"
		 WHERE "brand_id" = $1 AND "user_id" = $2
		   AND "status" = 'active'
		   AND ("expires_at" IS NULL OR "expires_at" > now())
		 LIMIT 1`,
		[brandId, userId]
	);
	return rows[0] ?? null;
}
