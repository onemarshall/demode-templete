# Auth Module Layout

The Better Auth integration lives in `src/lib/auth/`. Code is organized by execution context (server vs. client vs. shared) and by feature module.

## Structure

```bash
src/lib/auth/
├── index.ts                  # Top-level barrel export
├── server/                   # Server-only code
│   ├── config.ts             # Main `auth` instance
│   ├── plugins/              # Plugin assembly (core, security, CMS)
│   ├── options/              # User, email, social option builders
│   ├── email/                # Email service + provider adapters
│   ├── database/             # Database adapter wiring
│   ├── cms/                  # CMS provider adapters
│   ├── storage/              # File storage adapters
│   ├── helpers/              # Server-side helpers
│   ├── mcp.ts                # MCP server integration
│   └── types.ts
├── client/                   # Client-only code
│   ├── config.ts             # `authClient` instance
│   ├── helpers.ts            # Fetch wrapper, session helpers
│   └── plugins/              # Client plugins (security, etc.)
├── shared/                   # Shared between server and client
│   ├── env/                  # Zod-validated env schema
│   ├── logger.ts
│   ├── types/
│   ├── utils/                # Validation, constants
│   └── helpers.ts
├── modules/                  # Feature modules
│   ├── core.ts
│   ├── admin/
│   ├── stripe/               # Stripe billing integration
│   ├── emailOTP/
│   ├── lastLoginMethod/
│   ├── magicLink/
│   ├── oneTimeToken/
│   ├── passkey/
│   ├── security/
│   ├── siwe/                 # Sign-In with Ethereum
│   ├── twoFactor/
│   └── _template/            # Scaffold for new modules
├── security/                 # Security subsystem (rate limit, blocking, captcha, etc.)
└── remote/                   # SvelteKit remote functions (.remote.ts)
```

Each module under `modules/` follows the same pattern: an `index.ts` barrel, a `client.ts` for client-side helpers, types, and (where applicable) a `<name>.remote.ts` for server-only remote functions.

## Email Service

`server/email/` provides a unified interface for transactional email across providers (Resend, Usesend, Mock). Initialize from env config and send via the shared `sendEmail` API:

```typescript
import { createEmailProvider, initializeEmail } from '#lib/auth/server/email/index.js';

const emailProvider = initializeEmail({
	provider: 'resend',
	apiKey: process.env.EMAIL_RESEND_API_KEY,
	from: 'noreply@yourapp.com'
});

await emailProvider.sendEmail({
	to: 'user@example.com',
	subject: 'Welcome!',
	template: 'verification',
	data: { code: '123456' }
});
```

Templates cover email verification, password reset, and OTP codes.

## Security Plugins

`server/plugins/` assembles Better Auth plugins, with security features toggled by environment variables:

```typescript
import { buildSecurityPlugins } from '#lib/auth/server/plugins/index.js';

const securityPlugins = buildSecurityPlugins(env);
```

Features include CAPTCHA, rate limiting, temporary blocking, bot detection, behavioral fraud signals, geo-IP risk scoring, and security analytics. See [`docs/architecture/security.md`](./security.md) for full detail.

## Environment Management

`shared/env/` defines a Zod schema for all auth-related env vars:

```typescript
import { fullEnvSchema } from '#lib/auth/shared/env/index.js';

const env = fullEnvSchema.parse(process.env);
```

Production validation is strict; development falls back to sensible defaults. See [`docs/reference/environment.md`](../reference/environment.md).

## CMS Integration

`server/cms/` exposes a unified interface across Directus, Strapi, Payload, and Temple. The active provider is selected by env var. The CMS layer handles user sync, file management, and typed responses.

## Storage Providers

`server/storage/` wraps file storage with a single API across Local, AWS S3, Cloudinary, and Mock backends.

## SIWE (Sign-In with Ethereum)

`modules/siwe/` provides Ethereum wallet authentication: nonce generation, message signing/verification, ENS lookups, and multi-chain support (Ethereum, Polygon, Arbitrum, Base).

```typescript
import { buildSIWEPlugin } from '#lib/auth/modules/siwe/index.js';

const siwePlugin = buildSIWEPlugin(env);
```

Relevant env vars:

- `PUBLIC_AUTH_SIWE_PLUGIN` — toggle SIWE
- `SIWE_DOMAIN` — domain bound into SIWE messages
- `SIWE_RPC_URL` — Ethereum RPC endpoint
- `SIWE_ENABLE_ENS_LOOKUP` — enable ENS resolution

Server-side helpers:

```typescript
import { generateNonceForWallet, verifySignature } from '#lib/auth/modules/siwe/index.js';

const { nonce, expiresAt } = await generateNonceForWallet(walletAddress, chainId);
const result = await verifySignature(message, signature, walletAddress, chainId);
```

Client-side flow:

```typescript
import { createSIWEClient } from '#lib/auth/modules/siwe/index.js';

const siweClient = createSIWEClient();
const result = await siweClient.authenticate(authClient, domain, statement);
```

## Conventions

- Barrel `index.ts` per directory for clean imports.
- No `any` — every public surface is typed.
- Security and provider toggles flow from env, never from hard-coded flags.
- Server-only logic stays under `server/` or in `*.remote.ts` files; the client never imports it.
- SvelteKit hooks (in `src/hooks.server.ts`) handle request-level concerns instead of bespoke middleware.
