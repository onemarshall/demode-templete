/**
 * Route resolution and switcher queries (spec §8).
 *
 * These are pre-context, membership-scoped reads: they return only routing
 * and display metadata for resources the user is already authorised to see
 * (their own memberships and active assignments). Workspace *content* access
 * always goes through requireWorkspaceAccess + the context-required
 * repositories (D2). Slugs are routing identifiers, not permission evidence.
 */

import { getDB } from '#lib/auth/server/database/db.js';
import { listUserOrganisations } from './better-auth-adapter.js';

export interface RouteResolution {
	organisation: { id: string; name: string; slug: string };
	workspace: { id: string; name: string; slug: string };
}

/**
 * Resolve /o/:organisationSlug/w/:workspaceSlug server-side to stable IDs.
 * Verifies the workspace belongs to the organisation in the route (§8).
 * Returns null when either slug is unknown — the caller then denies without
 * disclosing which part failed (§6.3).
 */
export async function resolveRouteWorkspace(
	organisationSlug: string,
	workspaceSlug: string
): Promise<RouteResolution | null> {
	const db = await getDB();
	const { rows } = await db.query<{
		organisationId: string;
		organisationName: string;
		organisationSlug: string;
		workspaceId: string;
		workspaceName: string;
		workspaceSlug: string;
	}>(
		`SELECT o."id" AS "organisationId", o."name" AS "organisationName", o."slug" AS "organisationSlug",
		        w."id" AS "workspaceId", w."name" AS "workspaceName", w."slug" AS "workspaceSlug"
		 FROM "workspace" w
		 JOIN "organization" o ON o."id" = w."organisation_id"
		 WHERE o."slug" = $1 AND w."slug" = $2 AND w."organisation_id" = o."id"
		   AND w."status" = 'active'
		 LIMIT 1`,
		[organisationSlug, workspaceSlug]
	);
	const row = rows[0];
	if (!row) return null;
	return {
		organisation: { id: row.organisationId, name: row.organisationName, slug: row.organisationSlug },
		workspace: { id: row.workspaceId, name: row.workspaceName, slug: row.workspaceSlug }
	};
}

export interface SwitcherWorkspace {
	workspaceId: string;
	workspaceName: string;
	workspaceSlug: string;
	role: string;
}

export interface SwitcherOrganisation {
	organisationId: string;
	organisationName: string;
	organisationSlug: string;
	workspaces: SwitcherWorkspace[];
}

/**
 * Everything the global header switcher needs: the user's organisations
 * (live membership read) and, per organisation, the workspaces holding an
 * active, unexpired assignment. Organisations with no assigned workspaces
 * still appear (ordinary members with no workspace assignment, §13.2).
 */
export async function listSwitcherContext(userId: string): Promise<SwitcherOrganisation[]> {
	const organisations = await listUserOrganisations(userId);
	if (organisations.length === 0) return [];

	const db = await getDB();
	const { rows } = await db.query<{
		organisationId: string;
		workspaceId: string;
		workspaceName: string;
		workspaceSlug: string;
		role: string;
	}>(
		`SELECT w."organisation_id" AS "organisationId",
		        w."id" AS "workspaceId", w."name" AS "workspaceName", w."slug" AS "workspaceSlug",
		        wm."role"
		 FROM "workspace_member" wm
		 JOIN "workspace" w ON w."id" = wm."workspace_id"
		 WHERE wm."user_id" = $1
		   AND wm."status" = 'active'
		   AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		   AND w."status" = 'active'
		   AND w."organisation_id" = ANY($2)
		 ORDER BY w."created_at" ASC`,
		[userId, organisations.map((o) => o.id)]
	);

	return organisations.map((o) => ({
		organisationId: o.id,
		organisationName: o.name,
		organisationSlug: o.slug,
		workspaces: rows
			.filter((r) => r.organisationId === o.id)
			.map((r) => ({
				workspaceId: r.workspaceId,
				workspaceName: r.workspaceName,
				workspaceSlug: r.workspaceSlug,
				role: r.role
			}))
	}));
}

export interface WorkspacePreference {
	lastOrganisationId: string | null;
	lastWorkspaceId: string | null;
}

/** Landing-page preference only (§5) — never an authority for access. */
export async function getWorkspacePreference(userId: string): Promise<WorkspacePreference> {
	const db = await getDB();
	const { rows } = await db.query<WorkspacePreference>(
		`SELECT "last_organisation_id" AS "lastOrganisationId",
		        "last_workspace_id" AS "lastWorkspaceId"
		 FROM "user_workspace_preference" WHERE "user_id" = $1 LIMIT 1`,
		[userId]
	);
	return rows[0] ?? { lastOrganisationId: null, lastWorkspaceId: null };
}

export async function setWorkspacePreference(
	userId: string,
	organisationId: string,
	workspaceId: string
): Promise<void> {
	const db = await getDB();
	await db.query(
		`INSERT INTO "user_workspace_preference" ("user_id", "last_organisation_id", "last_workspace_id")
		 VALUES ($1, $2, $3)
		 ON CONFLICT ("user_id") DO UPDATE SET
			"last_organisation_id" = EXCLUDED."last_organisation_id",
			"last_workspace_id" = EXCLUDED."last_workspace_id",
			"updated_at" = now()`,
		[userId, organisationId, workspaceId]
	);
}
