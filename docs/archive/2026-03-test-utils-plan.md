# Test Utils Plugin Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mocked auth with a real Better Auth instance backed by SQLite in-memory, using the `testUtils` plugin for test helpers.

**Architecture:** A single test auth instance (`src/test/auth.ts`) using `better-sqlite3` with `:memory:` DB, `testUtils({ captureOTP: true })` plugin, and `cookiePrefix: 'iam-studio'`. Vitest aliases redirect `#lib/auth` and `$lib/auth/server/config` to this instance. Existing mock files for pg/redis/env stay to prevent real service imports.

**Tech Stack:** Better Auth, better-sqlite3, Vitest, SvelteKit, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-21-test-utils-setup-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/test/auth.ts` | Real Better Auth instance with SQLite + testUtils |
| Modify | `vitest.config.ts` | Update aliases, add `pool: 'forks'` |
| Modify | `src/test/setup.ts` | Run DB migration, close DB handle |
| Modify | `src/test/mocks/server-config.ts` | Re-export from `src/test/auth.ts` |
| Modify | `src/test/mocks/auth.ts` | Re-export from `src/test/auth.ts` |
| Delete | `src/test/helpers/test-utils.ts` | Replaced by testUtils plugin |
| Modify | `src/test/suite/auth-system.test.ts` | Switch to testUtils plugin |
| Modify | `src/test/integration/auth-api.test.ts` | Switch to testUtils plugin |
| Modify | `src/test/security/auth-security.test.ts` | Switch to testUtils plugin |
| Modify | `src/test/plugins/auth-plugins.test.ts` | Switch to testUtils plugin |
| Modify | `src/test/plugins/auth-plugins-simple.test.ts` | Switch to testUtils plugin |
| Modify | `src/test/performance/auth-performance.test.ts` | Switch to testUtils plugin |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install better-sqlite3 and types**

```bash
cd /Users/rob/Sites/_static/_sveltekit/_live/auth/auth-svelte
bun add -d better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 2: Verify installation**

```bash
bun -e "import Database from 'better-sqlite3'; const db = new Database(':memory:'); console.log('SQLite OK:', db.pragma('journal_mode', { simple: true }));"
```

Expected: prints "SQLite OK:" with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add better-sqlite3 dev dependency for test database"
```

---

## Task 2: Create Test Auth Instance

**Files:**
- Create: `src/test/auth.ts`

- [ ] **Step 1: Write the test auth instance**

```ts
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import Database from 'better-sqlite3';

export const db = new Database(':memory:');

export const auth = betterAuth({
	database: { type: 'sqlite', connection: db },
	secret: 'test-secret',
	baseURL: 'http://localhost:3000',
	appName: 'test-app',
	emailAndPassword: { enabled: true },
	plugins: [testUtils({ captureOTP: true })],
	advanced: {
		cookiePrefix: 'iam-studio',
	},
});

export async function getTestHelpers() {
	const ctx = await auth.$context;
	return ctx.test;
}

// Type exports to match production config ($lib/auth/server/config)
export type Auth = typeof auth;
export type User = Auth['$Infer']['Session']['user'];
export type Session = Auth['$Infer']['Session']['session'];
```

- [ ] **Step 2: Commit**

```bash
git add src/test/auth.ts
git commit -m "feat: add real Better Auth test instance with SQLite and testUtils plugin"
```

---

## Task 3: Update Mock Re-exports

**Files:**
- Modify: `src/test/mocks/auth.ts`
- Modify: `src/test/mocks/server-config.ts`

- [ ] **Step 1: Update `src/test/mocks/auth.ts`**

Replace entire contents with:

```ts
// Re-export real test auth instance
export { auth, db, getTestHelpers } from '../auth';
export type { Auth, User, Session } from '../auth';
```

- [ ] **Step 2: Update `src/test/mocks/server-config.ts`**

Replace entire contents with:

```ts
// Re-export real test auth instance
export { auth, db, getTestHelpers } from '../auth';
export type { Auth, User, Session } from '../auth';
```

- [ ] **Step 3: Commit**

```bash
git add src/test/mocks/auth.ts src/test/mocks/server-config.ts
git commit -m "refactor: mock re-exports point to real test auth instance"
```

---

## Task 4: Update Vitest Config

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Update aliases**

Change these two aliases in `vitest.config.ts` resolve.alias:

```ts
// BEFORE:
'#lib/auth/server/config': path.resolve('src/test/mocks/server-config.ts'),
'#lib/auth': path.resolve('src/test/mocks/auth.ts'),

// AFTER:
'#lib/auth/server/config': path.resolve('src/test/auth.ts'),
'#lib/auth': path.resolve('src/test/auth.ts'),
```

- [ ] **Step 2: Add `pool: 'forks'` for test isolation**

In the `test` block, add:

```ts
test: {
	pool: 'forks',
	// ... rest of existing config
}
```

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "refactor: point vitest aliases to real test auth instance, add pool forks"
```

---

## Task 5: Update Test Setup

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Rewrite `src/test/setup.ts`**

Replace entire contents with:

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterAll, vi } from 'vitest';
import { auth, db } from '$test/auth';

// Safety net: ensure env vars exist for any code reading process.env directly
process.env.BETTER_DATABASE_URL ??= 'postgres://test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret';
process.env.PUBLIC_SITE_URL ??= 'http://localhost:3000';
process.env.PUBLIC_APP_NAME ??= 'test-app';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.REDIS_PASSWORD ??= 'test-redis-password';

// Mock the analytics.remote module globally to avoid SSR evaluation issues
vi.mock('#lib/auth/remote/security/analytics.remote', () => ({
	getDashboardMetrics: vi.fn(),
	getSecuritySessions: vi.fn(),
	getTrustedDevices: vi.fn(),
	getSystemHealth: vi.fn(),
	getLiveThreats: vi.fn(),
	getFlaggedSessions: vi.fn(),
	getSecurityDashboard: vi.fn(),
	blockIp: vi.fn(),
	unblockIp: vi.fn(),
	whitelistDevice: vi.fn(),
	dismissSession: vi.fn(),
	clearMetricsCache: vi.fn(),
}));

beforeAll(async () => {
	// Create Better Auth tables in the in-memory SQLite DB
	await auth.api.migrateDatabase();
});

afterAll(() => {
	db.close();
});
```

- [ ] **Step 2: Run tests to check setup works**

```bash
bun run vitest run --reporter=verbose 2>&1 | head -50
```

Expected: Tests start running (some may fail — that's expected until we update test files).

- [ ] **Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "refactor: setup.ts runs Better Auth migration on in-memory SQLite"
```

---

## Task 6: Update `auth-system.test.ts`

**Files:**
- Modify: `src/test/suite/auth-system.test.ts`

This file imports `TestDatabaseHelper` and `createTestUser` from `$test/helpers/test-utils`. It tests system infrastructure health and test helper functions.

- [ ] **Step 1: Read the current file**

Read `src/test/suite/auth-system.test.ts` in full to understand all usages.

- [ ] **Step 2: Replace imports and usage**

Replace imports from `$test/helpers/test-utils` with:

```ts
import { auth, getTestHelpers } from '$test/auth';
```

Replace `createTestUser()` calls with `test.createUser()`.
Replace `new TestDatabaseHelper()` with `await getTestHelpers()`.
Replace manual session/header creation with `test.login()` and `test.getAuthHeaders()`.

**Mapping for methods with no 1:1 equivalent:**
- `dbHelper.createMockSession(userId)` → `test.login({ userId })` — returns `{ session, headers, cookies, token }`
- `createAuthHeaders(token)` → `test.getAuthHeaders({ userId })` — creates real session internally
- `createAuthCookies(token)` → `test.getCookies({ userId })` — creates real session internally

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/suite/auth-system.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/suite/auth-system.test.ts
git commit -m "refactor: auth-system tests use testUtils plugin"
```

---

## Task 7: Update `auth-api.test.ts`

**Files:**
- Modify: `src/test/integration/auth-api.test.ts`

This file imports `auth` from `#lib/auth` and helpers from `$test/helpers/test-utils`. It tests session management, password reset, 2FA endpoints with mocked auth API.

- [ ] **Step 1: Read the current file**

Read `src/test/integration/auth-api.test.ts` in full.

- [ ] **Step 2: Replace imports and usage**

Replace:
```ts
import { auth } from '#lib/auth.js';
import { TestDatabaseHelper, createAuthHeaders, createTestUser } from '$test/helpers/test-utils';
```
With:
```ts
import { auth, getTestHelpers } from '$test/auth';
```

Replace hand-rolled helpers with testUtils equivalents. Since `auth` is now a real instance (not `{}`), remove `vi.mocked()` wrappers and use real `auth.api` calls where possible.

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/integration/auth-api.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/integration/auth-api.test.ts
git commit -m "refactor: auth-api integration tests use testUtils plugin"
```

---

## Task 8: Update `auth-security.test.ts`

**Files:**
- Modify: `src/test/security/auth-security.test.ts`

Same pattern as Task 7. Imports `auth` from `#lib/auth` and helpers from `$test/helpers/test-utils`.

- [ ] **Step 1: Read the current file**

Read `src/test/security/auth-security.test.ts` in full.

- [ ] **Step 2: Replace imports and usage**

Same approach: replace imports with `$test/auth`, use `test.createUser()`, `test.saveUser()`, `test.getAuthHeaders()`, `test.login()`.

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/security/auth-security.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/security/auth-security.test.ts
git commit -m "refactor: auth-security tests use testUtils plugin"
```

---

## Task 9: Update `auth-plugins.test.ts`

**Files:**
- Modify: `src/test/plugins/auth-plugins.test.ts`

Imports `auth` from `#lib/auth/server/config` and helpers from `$test/helpers/test-utils`.

- [ ] **Step 1: Read the current file**

Read `src/test/plugins/auth-plugins.test.ts` in full.

- [ ] **Step 2: Replace imports and usage**

Replace `#lib/auth/server/config` import with `$test/auth`. Replace helper usage with testUtils equivalents.

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/plugins/auth-plugins.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/plugins/auth-plugins.test.ts
git commit -m "refactor: auth-plugins tests use testUtils plugin"
```

---

## Task 10: Update `auth-plugins-simple.test.ts`

**Files:**
- Modify: `src/test/plugins/auth-plugins-simple.test.ts`

Uses local `mockAuthAPI` and imports from `$test/helpers/test-utils`. This file creates its own mock API — decide whether to keep the local mock pattern or switch to real auth.

- [ ] **Step 1: Read the current file**

Read `src/test/plugins/auth-plugins-simple.test.ts` in full.

- [ ] **Step 2: Replace imports**

At minimum, replace `$test/helpers/test-utils` imports with `$test/auth`. The local `mockAuthAPI` can stay if these tests intentionally test mock behavior, or be replaced with real `auth.api` calls.

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/plugins/auth-plugins-simple.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/plugins/auth-plugins-simple.test.ts
git commit -m "refactor: auth-plugins-simple tests use testUtils plugin"
```

---

## Task 11: Update `auth-performance.test.ts`

**Files:**
- Modify: `src/test/performance/auth-performance.test.ts`

Imports `auth` from `#lib/auth` and helpers from `$test/helpers/test-utils`. Tests performance benchmarks.

- [ ] **Step 1: Read the current file**

Read `src/test/performance/auth-performance.test.ts` in full.

- [ ] **Step 2: Replace imports and usage**

Same approach. Performance tests should now measure real Better Auth operations against SQLite, giving meaningful benchmarks instead of measuring mock overhead.

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/performance/auth-performance.test.ts --reporter=verbose
```

Expected: All tests pass. Benchmarks may differ from previous thresholds — adjust if needed.

- [ ] **Step 4: Commit**

```bash
git add src/test/performance/auth-performance.test.ts
git commit -m "refactor: auth-performance tests use testUtils plugin with real SQLite"
```

---

## Task 12: Update `+server.test.ts`

**Files:**
- Modify: `src/test/+server.test.ts`

This file tests the system health endpoint and mocks `#lib/auth/shared/env`, `$lib/auth/server/database/db`, etc. It does NOT import from `$test/helpers/test-utils`, but the `$lib/auth` alias change may affect it.

- [ ] **Step 1: Read the current file**

Read `src/test/+server.test.ts` in full.

- [ ] **Step 2: Assess impact**

Since this file uses `vi.mock()` for its own imports, the alias change should be transparent. Verify it still works.

- [ ] **Step 3: Run this test file**

```bash
bun run vitest run src/test/+server.test.ts --reporter=verbose
```

Expected: All tests pass with no changes needed.

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add src/test/+server.test.ts
git commit -m "refactor: update server test for new auth instance"
```

---

## Task 13: Delete Hand-Rolled Test Utils

Now that all test files have been migrated, delete the old helpers.

**Files:**
- Delete: `src/test/helpers/test-utils.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/test/helpers/test-utils.ts
rmdir src/test/helpers 2>/dev/null || true
```

- [ ] **Step 2: Commit**

```bash
git add -A src/test/helpers/
git commit -m "refactor: remove hand-rolled test-utils, replaced by testUtils plugin"
```

---

## Task 14: Full Test Suite Verification

- [ ] **Step 1: Run the complete test suite**

```bash
bun run vitest run --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 2: Verify no remaining imports of old helpers**

```bash
grep -r "test/helpers/test-utils" src/ --include="*.ts"
```

Expected: No matches.

- [ ] **Step 3: Verify no empty auth mock usage**

```bash
grep -r "from '\$lib/auth'" src/test/ --include="*.ts"
```

Expected: Only re-export in `src/test/mocks/auth.ts`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: complete migration to Better Auth testUtils plugin"
```

---

## Task 15: Clean Up Stale Files

- [ ] **Step 1: Update stale references**

Update `src/test/guide/testing-setup.md` — it references `$test/helpers/test-utils` in multiple places. Update imports and examples to use `$test/auth` and the testUtils plugin pattern.

Check `src/test/examples/better-auth-test-examples.ts` — this already uses the Better Auth API directly and may just need minor updates.

- [ ] **Step 2: Commit any cleanup**

```bash
git add -A
git commit -m "chore: clean up stale test documentation and examples"
```
