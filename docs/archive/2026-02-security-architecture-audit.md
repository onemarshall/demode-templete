# Security Plugin Architecture Audit

**Date:** 2026-02-06
**Scope:** `src/lib/auth/security/` — full design-level security review
**Methodology:** Manual code review of all modules, data flows, trust boundaries, and failure modes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  securityPlugin()                     │
│  plugin.ts — merges config, wires hooks + endpoints  │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
    ┌──────▼──────┐          ┌────────▼────────┐
    │   Hooks     │          │   Endpoints     │
    │ before.ts   │          │ admin.ts        │
    │ after.ts    │          │ captcha.ts      │
    └──────┬──────┘          │ dashboard.ts    │
           │                 │ health.ts       │
    ┌──────▼──────┐          │ status.ts       │
    │  Features   │          └────────┬────────┘
    │ (priority)  │                   │
    │ 0  blocking │          ┌────────▼────────┐
    │ 10 rate-lim │          │   Services      │
    │ 20 captcha  │          │ blocked-ips.ts  │
    │ 30 geo      │          │ redis.ts        │
    │ 40 device   │          └─────────────────┘
    │ 50 behavior │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │    Core     │
    │ context.ts  │
    │ risk-engine │
    │ cache.ts    │
    │ helpers.ts  │
    │ feature.ts  │
    │ circuit-brk │
    └─────────────┘
```

**Request flow:** `before hook` → matcher (path check) → `createSecurityContext` → run features in priority order → accumulate risk factors → `calculateRiskScore` → block / captcha / pass → `attachSecurityContext` → Better Auth handler → `after hook` (record).

---

## Findings

### CRITICAL — Must Fix

#### C1. `skipInDevelopment` Bypasses ALL Security with No Warning at Runtime

**File:** `before.ts:242`

```ts
if (config.skipInDevelopment && isDevelopment()) {
	return { context: ctx };
}
```

**Risk:** If `NODE_ENV` or the shared env utility ever incorrectly returns `true` in production (e.g. misconfigured deploy, staging environment named "development"), **every security check is silently disabled**. The `isDevelopment()` result is cached permanently after first call.

**Recommendation:**

1. Log a prominent warning when development bypass is active.
2. Add a second guard: never skip if `isProduction()` is explicitly true.
3. Consider removing `skipInDevelopment` entirely — in dev mode, features will simply pass because there's no Redis / no geo API key, so they already return `null`.

---

#### C2. IP Spoofing via `X-Forwarded-For` — No Trusted Proxy Validation

**File:** `core/helpers.ts:83-114`

The entire security system trusts the first IP from `X-Forwarded-For` (or `CF-Connecting-IP`, `X-Real-IP`) without any trusted proxy chain validation. An attacker behind a reverse proxy can inject a fake header:

```
X-Forwarded-For: 1.2.3.4, attacker-real-ip
```

This lets an attacker:

- **Bypass IP-based rate limiting** (use a different spoofed IP each request)
- **Bypass IP blocklists** (pretend to be a different IP)
- **Evade geo-blocking** (spoof an IP from an allowed country)
- **Poison analytics** with fake IP data

**Recommendation:**

1. Accept IP headers **only from trusted proxy IPs** (configurable allowlist).
2. If behind Cloudflare, only trust `CF-Connecting-IP` and validate the request came from a Cloudflare IP range.
3. Alternatively, document that the plugin **requires** a reverse proxy that strips/overwrites `X-Forwarded-For` before forwarding.

---

#### C3. Admin Endpoints — No CSRF Protection

**Files:** `endpoints/admin.ts`, `endpoints/dashboard.ts`

Admin endpoints (`block-ip`, `unblock-ip`, `clear-cache`, `blocked-ips`, dashboard metrics/alerts/sessions) use cookie-based session auth (`requireAdmin` checks `ctx.context.session`) but have **no CSRF token validation**. An attacker can craft a malicious page that triggers these POST/DELETE requests using the admin's session cookie.

Attack scenario:

```html
<form action="https://target.com/api/auth/security/admin/block-ip" method="POST">
	<input name="ip" value="10.0.0.1" />
	<input name="reason" value="attacker blocked this" />
</form>
<script>
	document.forms[0].submit();
</script>
```

**Recommendation:**

1. Require a CSRF token (or use `SameSite=Strict` cookies + verify `Origin` header).
2. Better Auth may handle this at the framework level — verify it does, and if so, document the dependency.

---

#### C4. Dual IP Blocking Systems with Different Key Prefixes — Inconsistent State

**Files:** `features/blocking/ip-block.ts` (prefix: `block:ip:`) vs `services/blocked-ips.ts` (prefix: `blocked_ip:`)

Two completely separate Redis-backed IP blocking systems exist:

- **`ip-block.ts`** uses Redis `SET` (`block:ip:list`) — used by the **blocking feature** in the before hook
- **`blocked-ips.ts`** uses Redis `STRING` with TTL (`blocked_ip:<ip>`) — used by **admin endpoints**

When an admin blocks an IP via the admin endpoint, **the blocking feature won't see it** because it queries a different Redis key structure. This means admin-initiated blocks are silently ineffective for the main security pipeline.

**Recommendation:** Consolidate into a single blocking service. Either:

- Have `services/blocked-ips.ts` write to BOTH key structures, or
- Migrate the blocking feature to use `services/blocked-ips.ts` exclusively.

---

### HIGH — Should Fix Before Production

#### H1. CAPTCHA Feature Has Dead Code — `extractCaptchaResponse` Always Returns `undefined`

**File:** `features/captcha/index.ts:166-169`

```ts
function extractCaptchaResponse(_ctx: SecurityContext): string | undefined {
	return undefined;
}
```

Similarly, `extractBypassToken` always returns `undefined`. This means the CAPTCHA feature **never actually verifies a CAPTCHA token in the before hook**. The only working CAPTCHA verification is via the separate `/security/verify-captcha` endpoint.

**Impact:** The CAPTCHA feature will always return `{ data: { captchaRequired: true } }` but never block or verify — it's decorative. The real verification happens through a separate endpoint flow that issues a bypass token, but the bypass token is **also never checked** by the feature (because `extractBypassToken` returns `undefined`).

**Recommendation:** Implement `extractCaptchaResponse` to read from a request header (e.g., `X-Captcha-Token`) and `extractBypassToken` to read from a cookie or header (e.g., `X-Captcha-Bypass`).

---

#### H2. In-Memory CAPTCHA Bypass Token Store — Lost on Restart, Not Shared Across Instances

**File:** `endpoints/captcha.ts:40`

```ts
const bypassTokens = new Map<string, { identifier: string; expiresAt: number }>();
```

The `/security/verify-captcha` endpoint stores bypass tokens in a process-local `Map`. In a multi-instance deployment, a token issued by instance A won't be recognized by instance B. On restart, all tokens are lost.

Note: The **feature-level** CAPTCHA (`features/captcha/index.ts`) uses Redis for bypass tokens, but the **endpoint-level** CAPTCHA (`endpoints/captcha.ts`) does not. These are two separate, unconnected CAPTCHA implementations.

**Recommendation:** Use Redis for the endpoint's bypass tokens (it already exists in the feature-level implementation), or consolidate the two CAPTCHA systems.

---

#### H3. Admin Rate Limiter is Per-Process In-Memory — Trivially Bypassable in Multi-Instance

**File:** `endpoints/admin.ts:92`

```ts
const adminRateLimits = new Map<string, number[]>();
```

The admin rate limiter uses an in-memory `Map`, so in a multi-instance deployment, an attacker gets `ADMIN_RATE_LIMIT × N` requests per window (where N is the number of instances). The `Map` also grows unboundedly if many distinct IPs are seen (no eviction).

**Recommendation:**

1. Use the existing Redis-backed sliding window rate limiter.
2. Add eviction logic (or use `CacheManager`) for the in-memory fallback.

---

#### H4. `getIpBlockInfo` Returns Meaningless Data

**File:** `endpoints/admin.ts:60-67`

```ts
export async function getIpBlockInfo(ip: string): Promise<...> {
    const blocked = await serviceIsIPBlocked(ip);
    if (!blocked) return null;
    return { blockedUntil: 0, reason: 'Blocked' };
}
```

Returns hardcoded `blockedUntil: 0` and `reason: 'Blocked'` — no actual block metadata. Any consumer relying on this for block duration or reason gets wrong data.

**Recommendation:** Either remove this function (it's already deprecated) or delegate to `getBlockedIPs` for real metadata.

---

#### H5. Risk Score Leaked in Block/CAPTCHA Responses

**Files:** `hooks/before.ts:63-68, 84-95`

```ts
const body = {
	...BLOCKED_RESPONSE_BASE,
	riskScore: ctx.riskScore,
	riskLevel: ctx.riskLevel
};
```

Block and CAPTCHA responses include the exact `riskScore` and `riskLevel`. An attacker can use this to:

- Probe which headers/IPs/behaviors contribute to risk
- Incrementally adjust their attack to stay just below thresholds
- Map the entire scoring system through systematic probing

**Recommendation:** Remove `riskScore` and `riskLevel` from client-facing responses. Return only the action (`blocked`, `captcha_required`) and a generic reason.

---

#### H6. `/security/status` Endpoint Runs Full Feature Pipeline — Unauthenticated Oracle

**File:** `endpoints/status.ts:61-81`

The status endpoint runs **all security features** (blocking, rate limiting, geo, device, behavior) for the requester and returns the result including `riskScore`, `riskLevel`, `blocked`, `captchaRequired`, `rateLimited`, and `blockReason`.

This is essentially an unauthenticated oracle that tells attackers:

- Their current risk score
- Whether they're rate limited
- Whether they're blocked and why
- Whether CAPTCHA is required

**Recommendation:** Either:

1. Remove this endpoint entirely, or
2. Require authentication, or
3. Return only boolean `captchaRequired` (the only field the client legitimately needs).

---

#### H7. `/security/health` Endpoint Exposes Internal Architecture — No Auth Required

**File:** `endpoints/health.ts:45-103`

Returns feature IDs, cache hit/miss rates, total entries, and uptime to any caller. This leaks:

- Which security features are active
- Cache effectiveness (useful for timing attacks)
- Server uptime (useful for attack planning)

**Recommendation:** Require admin auth, or strip to just `{ status: 'healthy' }` for unauthenticated callers.

---

### MEDIUM — Should Address

#### M1. `services/blocked-ips.ts` Parses Redis Values with `JSON.parse` Without Validation

**File:** `services/blocked-ips.ts:96`

```ts
const blockData = JSON.parse(data);
```

If Redis data is corrupted or tampered with, `JSON.parse` may throw (handled by outer try/catch) or return unexpected shapes. The code then accesses `blockData.reason`, `blockData.blockedAt` etc. without validation.

**Recommendation:** Validate with Zod or add defensive guards.

---

#### M2. `incrementBlockedIPHitCount` Has Read-Modify-Write Race Condition

**File:** `services/blocked-ips.ts:220-241`

Reads the JSON, increments `hitCount`, writes it back. Two concurrent requests could both read `hitCount: 5`, both write `hitCount: 6` instead of `7`. Not security-critical, but metrics will be inaccurate.

**Recommendation:** Use a Lua script or separate Redis counter key.

---

#### M3. Device Fingerprint is Weak — Only User-Agent + First Two IP Octets

**File:** `features/device/index.ts:103-111`

```ts
const components = [ctx.userAgent, ctx.ip.split('.').slice(0, 2).join('.')].join('|');
return hashString(components).slice(0, 16);
```

This generates the same device ID for all users on the same `/16` subnet with the same browser. It also uses a non-cryptographic hash (`djb2`) truncated to 16 hex chars — high collision probability.

**Recommendation:** Accept client-side fingerprint data in the `SecurityContext` (screen, fonts, etc.) to improve uniqueness. Use a cryptographic hash (SHA-256) for the device ID.

---

#### M4. Regex DoS (ReDoS) in Rate Limit Rule Pattern Matching

**File:** `features/rate-limit/rules.ts:28`

```ts
regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
```

User-configurable `pathPattern` values are compiled to regex by replacing `*` with `.*`. A malicious pattern like `*a*a*a*a*a*a*a*a*b` creates a catastrophic backtracking regex. The regex is cached, so it only needs to be triggered once.

**Recommendation:** Use a glob-to-regex library that generates safe patterns, or validate patterns before compiling.

---

#### M5. `config.ts` Calls `getServerEnvSync()` at Module Load Time

**File:** `config.ts:128`

This eagerly loads and validates environment variables when the module is first imported, which can fail in test environments (as we saw) and makes the config rigid.

**Recommendation:** Lazy-load the env on first use, or make the config factory accept env as a parameter.

---

#### M6. Dashboard Metrics Are In-Memory and Reset on Restart

**File:** `endpoints/dashboard.ts:64-68`

```ts
const metricsStore = {
    requests: { total: 0, blocked: 0, captchaRequired: 0, rateLimited: 0 },
    ...
};
```

All dashboard metrics are stored in a process-local object. Multi-instance deployments see partial data, and restarts lose everything.

**Recommendation:** Persist metrics to Redis using atomic increments.

---

#### M7. BigDataCloud API Key Passed as URL Query Parameter

**File:** `features/geo/bigdatacloud.ts:31`

```ts
const url = `...?ip=${ip}&localityLanguage=en&key=${apiKey}`;
```

The API key is in the URL, which means it appears in:

- Server access logs
- Error messages and stack traces
- Any proxy/CDN logs between the server and BigDataCloud

**Recommendation:** Check if BigDataCloud supports API key via header. If not, ensure logging sanitizes URLs.

---

### LOW — Nice to Have

#### L1. No Audit Log for Admin Actions

Admin endpoints log to `securityLogger` but there's no persistent, tamper-resistant audit trail. An attacker who gains admin access could clear caches and unblock IPs with no durable record.

#### L2. Alerts Store Has No Maximum Size Guard

`endpoints/dashboard.ts:107` caps at 100 but uses `shift()` which is O(n). Under load this could cause micro-delays. Use a ring buffer or deque.

#### L3. `capjs` Provider Auto-Passes Verification

`endpoints/captcha.ts:112-114` — The `capjs` provider case returns `{ success: true }` without any verification. This is presumably for development, but if accidentally deployed it disables CAPTCHA entirely.

#### L4. No Request Size Limits on Admin Endpoints

The `blockIpSchema` validates field lengths but there's no middleware to limit overall request body size. A large JSON payload could cause memory pressure.

---

## Summary Matrix

| ID  | Severity | Category        | Issue                                                 |
| --- | -------- | --------------- | ----------------------------------------------------- |
| C1  | CRITICAL | Bypass          | `skipInDevelopment` can silently disable all security |
| C2  | CRITICAL | Spoofing        | IP spoofing via untrusted X-Forwarded-For             |
| C3  | CRITICAL | CSRF            | Admin endpoints lack CSRF protection                  |
| C4  | CRITICAL | Logic           | Dual IP blocking systems with inconsistent state      |
| H1  | HIGH     | Dead Code       | CAPTCHA feature never reads tokens from requests      |
| H2  | HIGH     | State           | CAPTCHA bypass tokens in-memory, not shared           |
| H3  | HIGH     | Rate Limiting   | Admin rate limiter per-process, bypassable            |
| H4  | HIGH     | Data Quality    | `getIpBlockInfo` returns hardcoded meaningless data   |
| H5  | HIGH     | Info Disclosure | Risk scores leaked in error responses                 |
| H6  | HIGH     | Info Disclosure | Status endpoint is an unauthenticated risk oracle     |
| H7  | HIGH     | Info Disclosure | Health endpoint exposes internal architecture         |
| M1  | MEDIUM   | Validation      | `JSON.parse` without schema validation on Redis data  |
| M2  | MEDIUM   | Race Condition  | Hit count increment is not atomic                     |
| M3  | MEDIUM   | Weakness        | Device fingerprint is too coarse                      |
| M4  | MEDIUM   | ReDoS           | User-supplied glob patterns compiled to unsafe regex  |
| M5  | MEDIUM   | Design          | Config eagerly loads env at import time               |
| M6  | MEDIUM   | State           | Dashboard metrics are in-memory, lost on restart      |
| M7  | MEDIUM   | Secret Exposure | API key in URL query string                           |
| L1  | LOW      | Audit           | No persistent audit log for admin actions             |
| L2  | LOW      | Performance     | Alerts store uses O(n) shift                          |
| L3  | LOW      | Configuration   | `capjs` provider auto-passes without verification     |
| L4  | LOW      | DoS             | No request body size limits on admin endpoints        |

---

## Recommended Fix Priority

**Phase 1 — Immediate (blocks production readiness):**

- C2: Add trusted proxy validation for IP extraction
- C4: Consolidate IP blocking to single Redis key structure
- C3: Verify/add CSRF protection on admin endpoints
- H5 + H6: Remove risk scores from responses; lock down status endpoint

**Phase 2 — Before launch:**

- C1: Add safeguards to `skipInDevelopment`
- H1 + H2: Wire up CAPTCHA feature extraction and consolidate token stores
- H3: Move admin rate limiter to Redis
- H7: Require auth for health endpoint details

**Phase 3 — Hardening:**

- M1–M7: Validation, atomic ops, fingerprint improvements, ReDoS protection
- L1–L4: Audit logging, performance, configuration safety
