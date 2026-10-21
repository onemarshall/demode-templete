# Test Utils Plugin Setup

## Problem

The current test setup mocks Better Auth to an empty object and uses hand-rolled test helpers that don't persist data. The `testUtils` plugin is configured in the real server config but never available in tests due to Vitest alias overrides. Tests cannot exercise real Better Auth behavior (session creation, login flows, OTP capture, etc.).

## Solution

Replace mocked auth with a real Better Auth instance backed by SQLite in-memory, using the `testUtils` plugin for test helpers.

## Architecture

### New: `src/test/auth.ts` — Test Auth Instance

A real Better Auth instance configured for testing:

- **Database**: `better-sqlite3` with `Database(":memory:")` — fresh DB per test run, no external services
- **Plugins**: `testUtils({ captureOTP: true })` plus any core plugins needed for realistic testing
- **Config**: Minimal — `secret`, `baseURL`, `appName`, `emailAndPassword.enabled`
- **Exports**: `auth` instance, `getTestHelpers()` convenience function

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
```

Note: `db` is exported so `setup.ts` can call `db.close()` in `afterAll`.

### Updated: Vitest Aliases

`vitest.config.ts` aliases point to the test auth instance:

| Alias | Current Target | New Target |
|-------|---------------|------------|
| `#lib/auth/server/config` | `src/test/mocks/server-config.ts` | `src/test/auth.ts` |
| `#lib/auth` | `src/test/mocks/auth.ts` | `src/test/auth.ts` |

The existing `$test` alias (`path.resolve('src/test')`) means `$test/auth` resolves to `src/test/auth.ts` — no new alias needed for test imports.

### Updated: `src/test/setup.ts`

- Removes manual `process.env` assignments (env mock handles this)
- Runs Better Auth schema migration on the in-memory SQLite DB before tests start
- Closes the SQLite handle after all tests complete

```ts
import { auth, db } from '$test/auth';

beforeAll(async () => {
	// Create Better Auth tables in the in-memory SQLite DB
	await auth.api.migrateDatabase();
});

afterAll(() => {
	db.close();
});
```

### Test Isolation

Vitest runs test files in parallel using worker threads. Each worker gets its own module instance, so each worker gets a separate in-memory SQLite database. This provides process-level isolation by default. For additional safety, the Vitest config sets `test.pool: 'forks'` to guarantee full process isolation between test files.

### Removed: `src/test/helpers/test-utils.ts`

Entirely replaced by `testUtils` plugin. The plugin provides:

- `test.createUser()` — factory with defaults
- `test.saveUser()` / `test.deleteUser()` — real DB persistence
- `test.login()` — creates real sessions, returns headers/cookies/token
- `test.getAuthHeaders()` — authenticated request headers
- `test.getCookies()` — browser-compatible cookies for E2E
- `test.getOTP()` / `test.clearOTPs()` — OTP capture

### Kept: Mock Files

These remain to prevent accidental real service imports:

- `src/test/mocks/pg.ts` — prevents real Postgres connections
- `src/test/mocks/redis.ts` — prevents real Redis connections
- `src/test/mocks/env.ts` — provides mock environment variables
- `src/test/mocks/app-environment.ts` — SvelteKit environment mock
- `src/test/mocks/simplewebauthn-server.ts` — WebAuthn mock
- `src/test/mocks/simplewebauthn-getcert.ts` — WebAuthn cert mock
- `src/test/mocks/env-private.ts` — SvelteKit private env mock
- `src/test/mocks/env-schema.ts` — env schema mock

### Updated: Mock Re-exports

- `src/test/mocks/server-config.ts` — re-exports from `src/test/auth.ts`
- `src/test/mocks/auth.ts` — re-exports from `src/test/auth.ts`

## Test Pattern

All tests follow the documented Better Auth `testUtils` pattern:

```ts
import { auth, getTestHelpers } from '$test/auth';
import type { TestHelpers } from 'better-auth/plugins';

describe('feature', () => {
	let test: TestHelpers;

	beforeAll(async () => {
		test = await getTestHelpers();
	});

	it('works with authenticated user', async () => {
		// createUser() returns an object with a pre-generated id
		const user = test.createUser({ email: 'test@example.com' });
		// saveUser() persists to DB and returns the saved user
		const savedUser = await test.saveUser(user);

		const headers = await test.getAuthHeaders({ userId: savedUser.id });
		const session = await auth.api.getSession({ headers });
		expect(session?.user.id).toBe(savedUser.id);

		await test.deleteUser(savedUser.id);
	});
});
```

## Dependencies

- **Add**: `better-sqlite3` (dev dependency)
- **Add**: `@types/better-sqlite3` (dev dependency)

## Migration Notes

- Existing tests that import from `$test/helpers/test-utils` need to switch to `$test/auth`
- The cookie prefix in tests is set to `iam-studio` to match the production config (`src/lib/auth/server/config.ts:99`)
- Tests that rely on the auth mock being an empty object will need updating to work with a real instance

## Trade-offs

- **SQLite vs Postgres**: Minor behavioral differences possible (e.g., JSON handling, case sensitivity). Acceptable for unit/integration tests.
- **In-memory DB**: Data lost between test runs. This is a feature — each run starts clean.
- **Schema migration**: Adds ~100ms to test startup. Negligible.
