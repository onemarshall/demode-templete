# Diagnostic module

Holds the delivered bytes of a Diagnostic report and reads them back.

- `server/import.ts` is an ingestion boundary. An operator imports an artefact
  the engine already published; the function verifies its SHA-256 against the
  engine's recorded `content_hash` before writing, and refuses a mismatch
  without touching the database. It takes an explicit
  `(organisationId, brandId)` pair because there is no user context at
  ingestion; the composite foreign keys on `output` and `output_version` refuse
  any pair the `brand` table does not own.
- `server/report.ts` is the read side. `readOutputReport` takes the branded
  `OperationContext` and constrains both `brand_id` and `organisation_id`, so
  another brand's version is a miss. `readSharedReport` is keyed by share slug
  alone, matching `findSharedOutput`, and still requires `can_share`.

Schema lives outside this folder: apply `database/migrations/0013_output_version.sql`
after `0009_montsel_products.sql`. Version rows are append-only by trigger; a
correction is a new version, never an edit.

Engine lineage (`engine_publication_ref`) is text with no foreign key. The
engine's ledger stays rebuildable and is not a dependency of this database.
