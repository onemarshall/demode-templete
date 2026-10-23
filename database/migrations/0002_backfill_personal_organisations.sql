-- Backfill existing identities into deterministic personal organisations.
-- The mapping table, not mutable organization.metadata or a workspace grant,
-- decides whether an organisation is personal and identifies its owner.
-- The runner wraps this whole file in one transaction, making retries safe.

DO $backfill$
DECLARE
	user_row record;
	v_organisation_id text;
	v_workspace_id text;
	v_member_id text;
	v_assignment_id text;
	v_personal_name text;
BEGIN
	FOR user_row IN
		SELECT u."id", u."name", u."email"
		FROM "user" u
		WHERE NOT EXISTS (
			SELECT 1 FROM "personal_organisation_owner" po
			WHERE po."owner_user_id" = u."id"
		)
		ORDER BY u."id"
	LOOP
		v_organisation_id := md5('montsel-org:' || user_row."id");
		v_workspace_id := md5('montsel-workspace:' || user_row."id");
		v_member_id := md5('montsel-member:' || user_row."id");
		v_assignment_id := md5('montsel-ws-member:' || user_row."id");
		v_personal_name := coalesce(nullif(user_row."name", ''), split_part(user_row."email", '@', 1));

		INSERT INTO "organization" ("id", "name", "slug", "metadata", "createdAt")
		VALUES (
			v_organisation_id,
			v_personal_name || $$'s Organisation$$,
			left(regexp_replace(lower(v_personal_name), '[^a-z0-9]+', '-', 'g'), 32) || '-' || left(md5(user_row."id"), 12),
			'{"montsel":{"type":"personal","backfilled":true}}',
			now()
		)
		ON CONFLICT ("id") DO NOTHING;

		INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt")
		VALUES (v_member_id, v_organisation_id, user_row."id", 'owner', now())
		ON CONFLICT DO NOTHING;

		INSERT INTO "workspace" ("id", "organisation_id", "name", "slug", "created_by", "status")
		VALUES (v_workspace_id, v_organisation_id, 'Main', 'main', user_row."id", 'active')
		ON CONFLICT ("id") DO NOTHING;

		INSERT INTO "workspace_member" (
			"id", "workspace_id", "user_id", "role", "status", "grant_source", "granted_by"
		)
		VALUES (v_assignment_id, v_workspace_id, user_row."id", 'workspace_admin', 'active', 'backfill', user_row."id")
		ON CONFLICT ("workspace_id", "user_id") DO NOTHING;

		INSERT INTO "user_workspace_preference" ("user_id", "last_organisation_id", "last_workspace_id")
		VALUES (user_row."id", v_organisation_id, v_workspace_id)
		ON CONFLICT ("user_id") DO NOTHING;

		INSERT INTO "audit_event" (
			"id", "organisation_id", "actor_type", "action", "resource_type", "resource_id", "outcome", "metadata"
		)
		VALUES (
			md5('montsel-audit-backfill:' || user_row."id"), v_organisation_id, 'system',
			'organisation.backfill_created', 'organisation', v_organisation_id, 'success',
			'{"backfilled":true,"type":"personal"}'::jsonb
		)
		ON CONFLICT ("id") DO NOTHING;

		INSERT INTO "personal_organisation_owner" ("organisation_id", "owner_user_id")
		VALUES (v_organisation_id, user_row."id")
		ON CONFLICT ("organisation_id") DO NOTHING;
	END LOOP;
END;
$backfill$;
