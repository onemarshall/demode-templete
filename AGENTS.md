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

```bash
# Disposable proof of import, hashes, tenancy, share and download reads
docker run -d --rm --name montsel-import-verify \
  -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_diagnostic_import_verify \
  -p 127.0.0.1:55440:5432 postgres:16
MONTSEL_IMPORT_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55440/montsel_diagnostic_import_verify \
  bun scripts/diagnostic/verify-import.ts
```

Artefact bytes are staged in the gitignored `.local-state/diagnostic-import/`,
named by their SHA-256. `scripts/diagnostic/hestia-artefacts.json` records the
engine's receipts; the import refuses any file whose hash differs.

```bash
# Disposable proof of the engagement model, envelope and route immutability
docker run -d --rm --name montsel-engagement-verify \
  -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_diagnostic_engagement_verify \
  -p 127.0.0.1:55441:5432 postgres:16
MONTSEL_ENGAGEMENT_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55441/montsel_diagnostic_engagement_verify \
  bun scripts/diagnostic/verify-engagement.ts
```

Both scripts share `scripts/diagnostic/disposable-db.ts`, which refuses any
database not named exactly as the caller declares and not on loopback.
