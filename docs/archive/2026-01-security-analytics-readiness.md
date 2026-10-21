# Security Analytics Production Readiness

Status legend: [] todo · 🔄 in-progress · ✅ done

## 0. Scope

This document tracks production-readiness work for:

- Better Auth server plugin: `src/lib/auth/security/plugins/security-analytics/*`
- Remote Functions wrapper: `src/lib/auth/remote/security/analytics.remote.ts`
- Dashboard SDK (used by remote functions): `src/lib/auth/security/plugins/security-analytics/sdk/*`

## 1. Current Verdict

- Server plugin: **production-ready** (admin gating + query validation + audit actor extraction implemented).
- SDK + remote-functions integration: **production-ready** (explicit production config; endpoints aligned; admin checks enforced).
- Verified: `vitest run` + `svelte-check`.

## 2. Key Findings

### 2.1 Endpoint mismatches (SDK vs plugin) (resolved)

Resolved: the `SecurityDashboardSDK` and Better Auth plugin endpoints are aligned.

Previously:

- SDK references: `/api/auth/security-analytics/system-health`
- SDK references: `/api/auth/security-analytics/dismiss-session`
- SDK references: `/api/auth/security-analytics/sessions`

The plugin endpoints (in `security-analytics/endpoints.ts`) now provide the expected paths.

### 2.2 Admin authorization model is inconsistent (resolved)

Resolved: admin access is enforced.

- Plugin endpoints enforce `isAdmin(ctx, config)`.
- SDK enforces admin access and does not grant access based solely on dev mode.

### 2.3 Query params are not Zod-validated in server plugin (resolved)

Resolved: endpoints validate query params with Zod rather than casting strings to types.

This was replaced with Zod schemas for:

- `timeRange`
- `riskLevel`
- pagination (`page`, `limit`)
- filters (`countryCode`, `userId`, `ip`, `acknowledged`, etc.)
- sorting (`sortBy`, `sortOrder`)

### 2.4 Audit actor extraction may be missing (resolved)

Resolved: `getUserId(ctx)` extracts userId from the same context shapes that `isAdmin(ctx, ...)` supports.

This prevents audit fields like `blockedBy` being recorded as `undefined`.

## 3. Production Readiness TODOs

### P0 (must fix before production)

- ✅ **sa-1** Remove dev-mode admin bypass in `SecurityDashboardSDK` (no non-admin access based solely on `dev`).
- ✅ **sa-2** Align SDK/remote-functions endpoint usage with actual plugin endpoints.
  - Option A: change SDK/remote functions to call existing plugin endpoints only.
  - Option B: add missing plugin endpoints to match SDK expectations.
- ✅ **sa-3** Wire `reason`/`duration` through block-IP flows end-to-end (remote function → SDK → plugin endpoint)
  and ensure audit captures actor userId.
- ✅ **sa-4** Zod-validate query params in `security-analytics/endpoints.ts` (timeRange, riskLevel, sortBy, pagination, filters).

### P1 (recommended)

- ✅ **sa-5** Unify userId extraction used for audit logging with admin check logic
  (make `getUserId` handle `ctx.user`/`ctx.session` shapes like `isAdmin`).
- ✅ **sa-6** Make `SecurityDashboardSDK` production config explicit.
  - baseUrl from env/config
  - remove placeholder admin domain
  - document required config

### P2 (nice to have)

- ✅ **sa-7** Add focused tests:
  - admin gating for analytics endpoints
  - query param validation
  - SDK/remote-functions smoke tests
- ✅ **sa-8** Decide/implement cache-stats semantics (`hitRate/hits/misses` currently always `0`).

## 4. Notes

- The Better Auth plugin endpoints already validate several POST bodies with Zod; extend the same approach to query params.
- Avoid duplicating admin authorization logic across layers; prefer a single source of truth.
- Cache stats: `hitRate`, `totalHits`, and `totalMisses` are not currently tracked by the security-analytics cache implementation.
  The API returns `tracked: false` (and a `note`) to make this explicit.
