-- 0022_diagnostic_schemas.sql
-- Phase 1 of the Montsel upgrade: the container, not the contents.
--
-- `diagnostic` will hold the engine's tables once they are ported, and `content`
-- will hold Directus's. Neither exists today and no application code reads
-- either, so this migration is additive: nothing in `public` changes and the app
-- runs exactly as it did.
--
-- Why a schema rather than a naming convention. The engine arrives with 43
-- migrations and its own tables, several named for concepts the app already owns
-- (`brand`, `page`, `contact`). A separate schema makes the boundary
-- enforceable — a schema-scoped role cannot reach across it, and a collision is
-- an error at migration time rather than a silent shadow at query time.
--
-- Neither schema joins the application's `search_path`, and this migration does
-- not alter the database or role default. An unqualified `CREATE TABLE "output"`
-- must keep landing in `public`; putting these on the path would let an engine
-- table shadow an app table with no migration to show for it.

CREATE SCHEMA "diagnostic";
CREATE SCHEMA "content";

COMMENT ON SCHEMA "diagnostic" IS
	'Montsel diagnostic engine tables. Written by the ported engine; inert to the application after a rollback.';
COMMENT ON SCHEMA "content" IS
	'Directus content tables. Public content and the operator console only; never a client-scoped read.';

-- A new schema grants nothing to PUBLIC by default. Stating the revocation keeps
-- that true if a later default-privilege change would otherwise open them.
REVOKE ALL ON SCHEMA "diagnostic" FROM PUBLIC;
REVOKE ALL ON SCHEMA "content" FROM PUBLIC;

-- The engine's ledger, and only the engine's.
--
-- `public.schema_migrations` stays the application's journal and must never
-- record an engine migration. After a rollback the previous release runs against
-- a database whose `diagnostic` schema it cannot read; a shared ledger would make
-- that release refuse to start over rows it has no way to interpret.
--
-- The shape mirrors `public.schema_migrations` exactly, so the ported runner is
-- the same runner pointed at a different schema rather than a second
-- implementation to keep in step.
CREATE TABLE "diagnostic"."schema_migrations" (
	"version" integer PRIMARY KEY,
	"name" text NOT NULL,
	"checksum" text NOT NULL,
	"applied_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "diagnostic"."schema_migration_attempts" (
	"id" bigserial PRIMARY KEY,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL CHECK ("status" IN ('running', 'applied', 'failed')),
	"started_at" timestamptz NOT NULL DEFAULT now(),
	"finished_at" timestamptz,
	"error" text
);

-- `content` gets no ledger of ours. Directus owns its own migration state
-- (`directus_migrations`) and runs it itself; a second journal in the same
-- schema would be a competing claim about which migrations have been applied.
