# Remote Functions

The auth system uses [SvelteKit Remote Functions](https://svelte.dev/docs/kit/remote-functions) for all server-to-client data access. Remote functions replace traditional `+server.ts` API routes for the auth, profile, security analytics, and admin surfaces — only operations that genuinely need an HTTP endpoint (webhooks, third-party callbacks) remain as routes.

## Structure

```text
src/
├── lib/
│   └── server/
│       └── auth-helpers.ts         # Shared auth utilities (session, requireAuth, requireAdmin)
└── remote/
    ├── index.ts                    # Barrel export
    ├── security/
    │   ├── analytics.remote.ts     # Dashboard queries + commands
    │   └── operations.remote.ts    # IP/device operations
    ├── profile/
    │   └── profile.remote.ts       # User profile, sessions, devices
    ├── auth/
    │   └── auth.remote.ts          # Sign-in/up, 2FA, social, password reset
    └── admin/
        └── admin.remote.ts         # User management, bulk ops, exports
```

## Configuration

Remote functions are enabled in `svelte.config.js`:

```javascript
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		experimental: {
			remoteFunctions: true
		}
	},
	compilerOptions: {
		experimental: {
			async: true // enables `await` expressions in components
		}
	}
};

export default config;
```

## Auth Helpers

`#lib/server/auth-helpers.ts` provides the canonical way to access session state inside a remote function. It uses `getRequestEvent()` so the real request headers (cookies included) are passed to Better Auth.

```typescript
import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';

export function getRequestHeaders(): Headers {
	const event = getRequestEvent();
	return event.request.headers;
}

export async function getSession() {
	return auth.api.getSession({ headers: getRequestHeaders() });
}

export async function requireAuth() {
	const session = await getSession();
	if (!session?.user) error(401, 'Unauthorized');
	return session;
}

export async function requireAdmin() {
	const session = await requireAuth();
	if (!session.user.isAdmin) error(403, 'Admin access required');
	return session;
}

export async function requireSameUser(userId: string) {
	const session = await requireAuth();
	if (session.user.id !== userId) error(403, 'Access denied');
	return session;
}
```

## Patterns

### 1. Schema validation for every parameterized query

All `query()` and `command()` calls that take input use a Zod schema as the first argument:

```typescript
export const getDashboardMetrics = query(z.string().default('24h'), async (timeRange) => {
	// ...
});

export const getSecuritySessions = query(
	z
		.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			riskLevel: z.string().optional()
		})
		.default({}),
	async (filters) => {
		// ...
	}
);
```

### 2. Real request headers, not `new Headers()`

```typescript
import { getRequestHeaders } from '#lib/server/auth-helpers';

const session = await auth.api.getSession({
	headers: getRequestHeaders()
});
```

`new Headers()` produces an empty header bag and breaks session resolution.

### 3. Awaited cache invalidation in commands

```typescript
export const blockIp = command(schema, async (data) => {
	await sdk.blockIp(data.ip);

	await Promise.all([
		getDashboardMetrics().refresh(),
		getLiveThreats().refresh(),
		getFlaggedSessions().refresh()
	]);

	return { success: true };
});
```

Fire-and-forget refresh calls leave the UI stale.

### 4. SvelteKit `error()` for HTTP semantics

```typescript
import { error } from '@sveltejs/kit';

error(401, 'Unauthorized');
error(403, 'Admin access required');
error(400, 'Invalid password');
error(500, 'Failed to load metrics');
```

### 5. `z.literal()` for destructive confirmations

```typescript
z.object({
	confirmation: z.literal('DELETE')
});
```

## Available Remote Functions

### Security analytics (`remote/security/`)

`getDashboardMetrics`, `getSecuritySessions`, `getTrustedDevices`, `getSystemHealth`, `getLiveThreats`, `getFlaggedSessions`, `blockIp`, `unblockIp`, `whitelistDevice`, `clearMetricsCache`.

### Profile (`remote/profile/`)

`getUserProfile`, `updateProfile`, `changeEmail`, `changePassword`, `getUserSessions`, `revokeSession`, `revokeAllOtherSessions`, `getUserTrustedDevices`, `trustDevice`, `removeDeviceTrust`, `getBackupCodes`, `generateBackupCodes`, `deleteAccount`.

### Authentication (`remote/auth/`)

`signIn`, `signUp`, `signOut`, `requestPasswordReset`, `resetPassword`, `resendVerificationEmail`, `verifyEmail`, `enable2FA`, `confirm2FAEnable`, `disable2FA`, `verify2FACode`, `linkSocialProvider`, `unlinkSocialProvider`, `getCurrentSession`, `isAuthenticated`, `getAuthStatus`.

### Admin (`remote/admin/`)

`getAllUsers`, `getUserDetails`, `getSystemStats`, `updateUserRole`, `banUser`, `unbanUser`, `resetUserPassword`, `deleteUser`, `bulkBanUsers`, `bulkDeleteUsers`, `clearSystemCache`, `exportUserData`.

## Usage

### `await` expressions in components

```svelte
<script>
	import { getDashboardMetrics } from '#lib/remote/index.js';
</script>

{#await getDashboardMetrics('24h')}
	<p>Loading security data...</p>
{:then metrics}
	<p>Active Sessions: {metrics.activeSessions}</p>
	<p>Blocked IPs: {metrics.blockedIps}</p>
{:catch error}
	<p>Error: {error.message}</p>
{/await}
```

### Reactive query handle

```svelte
<script>
	import { getDashboardMetrics } from '#lib/remote/index.js';

	const metrics = getDashboardMetrics('24h');
</script>

{#if metrics.loading}
	<p>Loading...</p>
{:else if metrics.error}
	<p>Error: {metrics.error.message}</p>
{:else}
	<p>Active Sessions: {metrics.current.activeSessions}</p>
{/if}

<button onclick={() => metrics.refresh()}>Refresh Data</button>
```

### Commands with automatic refresh

```svelte
<script>
	import { blockIp } from '#lib/remote/index.js';

	let ip = '';
	let reason = '';
	let loading = false;
	let error = null;

	async function handleBlock() {
		loading = true;
		error = null;
		try {
			await blockIp({ ip, reason });
			ip = '';
			reason = '';
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<form onsubmit|preventDefault={handleBlock}>
	<input bind:value={ip} placeholder="IP Address" required />
	<input bind:value={reason} placeholder="Reason" />
	<button type="submit" disabled={loading}>
		{loading ? 'Blocking...' : 'Block IP'}
	</button>
</form>
```

### Client-driven invalidation

```typescript
import { blockIp, getDashboardMetrics, getLiveThreats } from '#lib/remote/index.js';

async function handleBlock(ip: string) {
	await blockIp({ ip }).updates(getDashboardMetrics(), getLiveThreats());
}

// With optimistic updates
async function handleBlockOptimistic(ip: string) {
	await blockIp({ ip }).updates(
		getLiveThreats().withOverride((threats) => threats.filter((t) => t.ip !== ip))
	);
}
```

### Batch loading

```svelte
<script>
	import { getCompleteProfile } from '#lib/remote/index.js';

	let { userId } = $props();
</script>

{#await getCompleteProfile(userId)}
	<p>Loading profile...</p>
{:then data}
	<h2>{data.profile.name}</h2>
	<p>{data.sessions.length} active sessions</p>
	<p>{data.devices.length} trusted devices</p>
{:catch error}
	<p>Error: {error.message}</p>
{/await}
```

## Testing

### Unit tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getDashboardMetrics } from '#lib/remote/security/analytics.remote.js';

vi.mock('#lib/security/security-analytics/sdk/dashboard-sdk', () => ({
	SecurityDashboardSDK: vi.fn().mockImplementation(() => ({
		authenticateRequest: vi.fn().mockResolvedValue({ userId: 'test' }),
		loadDashboardData: vi.fn().mockResolvedValue({
			metrics: { activeSessions: 10, blockedIps: 5 }
		})
	}))
}));

describe('Security analytics remote functions', () => {
	it('fetches dashboard metrics', async () => {
		const result = await getDashboardMetrics('24h');
		expect(result.activeSessions).toBe(10);
		expect(result.blockedIps).toBe(5);
	});
});
```

### Component integration tests

```typescript
import { render, screen, waitFor } from '@testing-library/svelte';
import SecurityDashboard from './SecurityDashboard.svelte';

it('loads and displays metrics', async () => {
	render(SecurityDashboard);
	expect(screen.getByText('Loading security data...')).toBeInTheDocument();

	await waitFor(() => {
		expect(screen.getByText('Active Sessions: 10')).toBeInTheDocument();
	});
});
```

## Troubleshooting

### Remote function not found

Confirm `experimental.remoteFunctions: true` is set in `svelte.config.js`.

### Empty session / auth not working

Use the helpers — never `new Headers()`:

```typescript
import { getSession, requireAuth } from '#lib/server/auth-helpers';

const session = await getSession();
// or, to throw 401:
const session = await requireAuth();
```

### Type errors with Zod schemas

```typescript
// Wrong
z.object({ email: z.email() });

// Correct
z.object({ email: z.string().email() });
```

### Refresh not updating UI

`await` the refresh call:

```typescript
await getDashboardMetrics().refresh();
```

### Validation errors not surfacing

Build cross-field rules with `.refine`:

```typescript
const schema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});
```

## File reference

| File                                   | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| `lib/server/auth-helpers.ts`           | Shared authentication utilities              |
| `remote/index.ts`                      | Barrel exports for all remote functions      |
| `remote/security/analytics.remote.ts`  | Security dashboard queries and commands      |
| `remote/security/operations.remote.ts` | IP management, threat operations             |
| `remote/profile/profile.remote.ts`     | User profile management                      |
| `remote/auth/auth.remote.ts`           | Authentication flow (sign-in, 2FA, etc.)    |
| `remote/admin/admin.remote.ts`         | Administrative operations                    |
