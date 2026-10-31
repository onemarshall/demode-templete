You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Diagnostic artefact import (Phase 1)

`output_version` holds delivered report bytes; rows are append-only by trigger.
Never run the migration runner or the import against the operator's local stack.

### Verifying anything

Every proof runs against a throwaway Postgres. `bun run verify` starts it, waits
until it accepts connections, runs the proof and removes it again. Do not
memorise container commands.

```bash
bun run verify              # list the proofs and what each establishes
bun run verify all          # every proof that needs no argument
bun run verify schemas      # the diagnostic and content schema container
bun run verify drain        # the G11 queue-drain check
bun run verify engagement   # the engagement model, payment gate and envelope
bun run verify import       # published report bytes against their recorded hash
bun run verify signal       # the Signal delivery lifecycle against a fake engine
bun run verify sector-import --candidate=<file.json>
bun run verify sectors      # every sector synthesis: importable and approvable?
```

`--keep` leaves the container running so a failure can be inspected.

Each proof declares the database name it expects, and
`scripts/diagnostic/disposable-db.ts` refuses any database not named exactly as
declared and not on loopback. Nothing here can reach the operator's stack. The
sector proof drives the engine's importer as a subprocess with
`MONTSEL_LOAD_DOTENV=0`, so the engine's own `.env` cannot win.

### Sector synthesis import

`bun run verify sectors` compiles every `Sector-Intelligence-Synthesis.md` in the
research tree, imports it, and asks the approval gate. **Exit 0** means every
sector imports and can be approved; **exit 2** means some cannot, with the gate's
reason printed per sector.

Importability and approvability are different questions, which is why the command
answers both: a file can import cleanly — 100+ context items — and still be
refused because its `deployment_status` or `document_status` is not one the gate
accepts. Retained copies under `history/`, `archive/` and `validation/` are
excluded, and the summary counts sectors rather than files.

A single candidate: `bun run verify sector-import --candidate=<file.json>`.
Markdown compiles to that JSON with the engine's own
`compile sector-synthesis --file=<synthesis.md> --out=<record.json>`.

### What the proofs establish

- **schemas** — `diagnostic` and `content` exist, are empty, hold no PUBLIC
  privilege, and a same-named `diagnostic` table cannot shadow `public."output"`.
  The `diagnostic` schema carries the engine's own ledger, separate from
  `public.schema_migrations`; `content` carries none, because Directus owns its
  migration state. Neither schema joins the application's `search_path`.
- **drain** — the two queries A9.2 names. A missing `diagnostic.job` table blocks
  rather than passing: an unverifiable queue is not a drained one. In-flight rows
  are printed because A9.2 requires them recorded as stranded. The cutover run is
  `bun scripts/diagnostic/drain-check.ts --out <log>` against the real database,
  and `--rollback` for the second capture.
- **engagement** — intake validation, idempotent resume, the payment gate, a
  frozen delivery route, cross-brand denial, and the three-fact engine envelope.
- **import** — bytes that do not match their recorded hash write nothing;
  identical bytes never land twice; artefact bytes are staged in the gitignored
  `.local-state/diagnostic-import/`, named by SHA-256, with
  `scripts/diagnostic/hestia-artefacts.json` recording the engine's receipts.
- **signal** — the delivery lifecycle against a loopback fake engine. No Stripe,
  no customer data, no real engine; `DIAGNOSTIC_ENGINE_URL` is pointed at the
  fake for the duration. The suite skips when its variable is absent, so the
  default test run is unaffected.
