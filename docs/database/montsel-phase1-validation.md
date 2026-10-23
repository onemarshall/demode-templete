# Montsel Phase 1 database validation and deployment

This procedure validates the Better Auth plugin schema against the installed Better Auth package, then applies Montsel's versioned SQL migrations. Better Auth owns `user`, `session`, `account`, `verification`, `organization`, `member` and `invitation`; Montsel's runner owns `workspace`, personal-organisation ownership, assignment, provisioning, preference and audit tables.

## Isolated PostgreSQL proof

The verifier is intentionally limited to a loopback PostgreSQL URL and a database named exactly `montsel_phase1_verify`. It never creates, drops or resets a database. On its first run the public schema must be empty. Later runs require the completed Montsel migration ledger and only the two synthetic verifier users. Do not point it at an application, staging or production database.

Create the disposable database through a local PostgreSQL instance, then run:

```sh
createdb montsel_phase1_verify
MONTSEL_PHASE1_VERIFY_DATABASE_URL='postgresql://localhost/montsel_phase1_verify' \
  bun scripts/database/phase1-verify.ts
```

The verifier imports `scripts/auth-cli.ts`, gets the schema plan from the installed `better-auth/db/migration` `getMigrations` API, applies the installed plugin schema, and checks the resulting `user`, `organization`, `member` and `invitation` columns. It inserts two synthetic users using the real Better Auth user columns, runs Montsel migrations 1 and 2, invokes the runner a second time, and asks Better Auth for another migration plan to detect remaining schema drift. The expected result reports two personal-owner links, workspaces, active assignments and preferences. Re-running the verifier is safe and checks that the schema and backfill remain stable.

The successful isolated proof used Better Auth 1.7.12 and PostgreSQL 17.9. The plugin-created `organization` columns were `id`, `name`, `slug`, `logo`, `createdAt` and `metadata`; `member` contained `id`, `organizationId`, `userId`, `role` and `createdAt`; `invitation` contained `id`, `organizationId`, `email`, `role`, `status`, `expiresAt`, `createdAt` and `inviterId`. The installed `user` schema included `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt` and the configured additional fields. Better Auth reported no remaining migration changes after application.

The verifier proves schema ordering, plugin column compatibility, migration repeatability and the synthetic-user backfill. It does not exercise live invitation acceptance, membership removal or any deployed tenant data.

## Application database deployment

Take and verify a database backup first. Use the exact production environment values for conditional plugins, including passkey settings, so the migration config and running auth service agree. Run Better Auth's installed schema plan before Montsel's SQL runner. The following command uses `getMigrations` from the installed Better Auth version through the repository's CLI config; it applies the plan, then checks that no schema changes remain:

```sh
export BETTER_DATABASE_URL="$MONTSEL_DATABASE_URL"
bun --eval '
  import auth from "./scripts/auth-cli.ts";
  import { getMigrations } from "better-auth/db/migration";
  const pool = auth.options.database;
  try {
    auth.options.advanced = {
      ...auth.options.advanced,
      database: { ...auth.options.advanced?.database, validateSchema: false }
    };
    const before = await getMigrations(auth.options);
    if (before.unsafeChanges.length || before.schemaProblems.length) {
      throw new Error([...before.unsafeChanges, ...before.schemaProblems].join("; "));
    }
    await before.runMigrations();
    const after = await getMigrations(auth.options);
    if (after.toBeCreated.length || after.toBeAdded.length || after.toBeAddedIndexes.length ||
        after.unsafeChanges.length || after.schemaProblems.length) {
      throw new Error("Better Auth schema still has pending or unsafe changes after migration.");
    }
  } finally {
    await pool.end();
  }
'
BETTER_DATABASE_URL="$MONTSEL_DATABASE_URL" bun scripts/database/migrate.ts
BETTER_DATABASE_URL="$MONTSEL_DATABASE_URL" bun scripts/database/migrate.ts --status
```

The Better Auth step must complete before Montsel migration 1 because the SQL references its organisation and identity tables. The Montsel runner applies each numbered SQL file in order, in its own transaction, while holding a PostgreSQL advisory lock. The backfill is part of migration 2 and runs in that migration transaction. Do not enable tenant-scoped routes until both migration versions are recorded and the application code that consumes the new schema is deployed.

`--status` and `--dry-run` are read-only. The runner records checksum and applied time in `schema_migrations`, and keeps each attempt in `schema_migration_attempts`. A failed SQL migration rolls back its entire file and records the failure. Applied migration files are immutable: repair forward with a new migration rather than editing an applied file. If a deployment is interrupted, inspect the ledger and attempt table, correct the cause, and rerun the same command; it applies only migrations absent from the ledger.

The schema retains organisation and workspace data if an identity is removed. Actor references are nulled and that user's workspace assignments/preferences are removed. The explicit `personal_organisation_owner` row is the authoritative personal-organisation marker; transfer or deletion flows must update or interpret its owner field consistently. Account deletion and organisation-ownership lifecycle checks remain application responsibilities and should run before Better Auth performs identity deletion.
