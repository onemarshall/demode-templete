# Better Auth Directus Sync SDK — Design Spec

**Date**: 2026-03-22
**Status**: Implemented
**Scope**: Bidirectional user sync between Better Auth and Directus CMS
**Package**: `packages/better-auth-directus/`

## Problem

The auth-svelte project had ~1,249 lines of Directus sync code spread across 6 files. Extracting into an SDK with explicit API surface improves AI agent onboarding, prevents boundary violations, and produces faster, more accurate changes.

## Design Decisions

1. **User sync only** — no content sync (pages, posts, forms)
2. **Minimal schema** — `directus_users` + `directus_files` only (not project-specific 868-line schema)
3. **Better Auth plugin** — auto lifecycle hooks + manual client for direct control
4. **Built-in resilience** — circuit breaker, timeouts, rate limiting on all calls
5. **Pluggable logger** — `SyncLogger` interface, silent by default
6. **Bidirectional sync** — webhook handler + `onUserUpdatedFromDirectus` callback
7. **Bun workspace** — local dev via workspace, publishable to npm later

## Public API

```ts
import { createDirectusSync, directusSyncPlugin } from 'better-auth-directus';

const sync = createDirectusSync({ directusUrl, directusToken, defaultRoleId?, logger?, boundary?, rateLimit?, onUserUpdatedFromDirectus? });

// Forward: Better Auth → Directus
sync.syncUser(user)           sync.getUser(id)          sync.findUser({email?, id?})
sync.deleteUser(id)           sync.uploadAvatar(id, f)  sync.removeAvatar(id)
sync.uploadFile(f, folder?)   sync.deleteFile(id)       sync.getFile(id)

// Reverse: Directus → Better Auth
sync.handleDirectusWebhook(payload)    sync.pullUser(directusUserId)

// Utilities
sync.healthCheck()   sync.getAssetUrl(id)   sync.destroy()
```

## Migration

- 5 files moved from `providers/directus/` to SDK
- `providers/directus/index.ts` became ~100-line thin wrapper
- All other CMS files untouched (types, factory, service, strapi, payload, temple)
