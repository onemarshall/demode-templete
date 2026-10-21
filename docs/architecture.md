# Architecture Overview

## Core Principles

This authentication system is built with **modularity** and **extensibility** at its core. The architecture allows you to:

- Swap authentication providers (Better Auth)
- Swap CMS providers (Directus, Strapi, Payload CMS, Sanity)
- Swap email providers (Usesend, Resend, SendGrid)
- Swap storage providers (Local, S3, Cloudinary)

## System Architecture

```typescript
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Svelte 5)                      │
│  - Sign In/Sign Up Pages                                    │
│  - Profile Management                                       │
│  - Session Management                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (SvelteKit Routes)                    │
│  - /api/auth/* (Better Auth handler)                        │
│  - /api/email/* (Email verification)                        │
│  - /api/delete/* (Account deletion)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌──────────┐
   │ Better │  │   CMS    │  │  Email   │
   │ Auth   │  │ Provider │  │ Provider │
   └────────┘  └──────────┘  └──────────┘
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌──────────┐
   │   DB   │  │ Directus │  │ Usesend  │
   │(Postgres)│ │  (CMS)   │  │ (Email)  │
   └────────┘  └──────────┘  └──────────┘
```

## Module Structure

### Authentication (`/src/lib/auth/server/`)

**Responsibility:** Handle user authentication, sessions, and auth-related operations

**Key Files:**

- `config.ts` - Better Auth initialization
- `plugins/` - Auth plugins (passkeys, 2FA, lastLoginMethod, etc.)
- `options/` - Auth configuration (email, user, socials, hooks)
- `../security/` - Security utilities (abuse protection, fraud detection)

**Key Concepts:**

- Uses Better Auth as the core authentication library
- Plugins extend auth functionality (passkeys, 2FA, etc.)
- Database hooks validate and transform data
- Security middleware detects suspicious activity

### CMS Provider (`/src/lib/auth/server/cms/`)

**Responsibility:** Abstract CMS operations behind a provider interface

**Key Files:**

- `types.ts` - CMS provider interface definition
- `providers/directus/` - Directus implementation
- `index.ts` - Factory for creating providers

**Supported Operations:**

- Get user information
- Update user avatar
- Delete user avatar
- Upload files
- Delete files
- Health checks

**Why This Abstraction?**

- Allows swapping Directus for Strapi, Payload CMS, or Sanity
- Contributors can add new providers without modifying core auth
- Clear contract for what a CMS provider must implement
- Testable with mock providers

### Email Provider (`/src/lib/auth/server/email/`)

**Responsibility:** Send transactional emails

**Current Implementation:** Usesend

**Supported Emails:**

- Verification emails
- OTP emails
- Password reset emails
- Account notifications

### Security Layer (`/src/hooks.server.ts`)

**Responsibility:** Protect the application from abuse and fraud

**Key Features:**

- Rate limiting
- Suspicious activity detection
- CAPTCHA integration
- Security headers
- CSP (Content Security Policy)

## Data Flow

### User Sign Up

```typescript
1. User submits sign-up form
   ↓
2. API route validates input (Zod schema)
   ↓
3. Better Auth creates user in database
   ↓
4. Email provider sends verification email
   ↓
5. User clicks verification link
   ↓
6. Email verified in database
   ↓
7. User redirected to profile
```

### User Avatar Update

```typescript
1. User uploads avatar image
   ↓
2. API route receives file
   ↓
3. CMS provider uploads file
   ↓
4. CMS provider updates user record with avatar URL
   ↓
5. Frontend displays new avatar
```

## Configuration Management

Environment variables are validated using Zod schemas:

```typescript
// Public variables (exposed to client)
PUBLIC_APP_NAME;
PUBLIC_SITE_URL;
PUBLIC_AUTH_URL;
PUBLIC_AUTH_PASSKEY_RPID;
// ... etc

// Server variables (secret, never exposed)
BETTER_AUTH_SECRET;
BETTER_DATABASE_URL;
EMAIL_API_KEY;
// ... etc

// CMS-specific variables
PUBLIC_DIRECTUS_URL;
DIRECTUS_ADMIN_TOKEN;
// ... etc
```

## Plugin System

### Built-in Plugins

1. **Passkey Plugin** - WebAuthn/FIDO2 support
2. **Two-Factor Plugin** - TOTP and OTP support
3. **Last Login Method Plugin** - Track authentication method
4. **SvelteKit Cookies Plugin** - Handle cookies in SvelteKit

### Adding Custom Plugins

Plugins are configured in `/src/lib/auth/server/plugins/`:

```typescript
export async function buildPlugins(env: FullEnv): Promise<BetterAuthPlugin[]> {
	const plugins: BetterAuthPlugin[] = [
		// Existing plugins...

		// Add your custom plugin here
		customPlugin({
			// configuration
		})
	];

	return plugins;
}
```

## Error Handling

The system uses typed error handling:

```typescript
// Authentication errors
throw new Error('Invalid credentials');

// CMS errors
throw new Error('Failed to update user avatar');

// Email errors
throw new Error('Failed to send verification email');

// Security errors
throw error(429, 'Rate limited');
throw error(403, 'Security verification required');
```

## Testing Strategy

### Unit Tests

- Test individual providers (CMS, Email, Auth)
- Mock external dependencies
- Test error handling

### Integration Tests

- Test auth flow end-to-end
- Test CMS operations with real provider
- Test email sending

### E2E Tests

- Test complete user journeys
- Test UI interactions
- Test security features

## Performance Considerations

1. **Session Caching** - Sessions cached in cookies for 5 minutes
2. **Database Connection Pooling** - Max 20 connections
3. **Rate Limiting** - 100 requests per 10 seconds
4. **Lazy Loading** - Plugins loaded on-demand
5. **Health Checks** - CMS provider health checked on startup

## Security Considerations

1. **Secrets Management** - All secrets validated and sanitized
2. **CSRF Protection** - Built into SvelteKit
3. **CORS** - Configured for trusted origins only
4. **Security Headers** - CSP, HSTS, X-Frame-Options, etc.
5. **Rate Limiting** - Prevents brute force attacks
6. **Abuse Detection** - Detects suspicious patterns
7. **Passkey Validation** - Ensures user context is preserved

## Extending the System

### Adding a New CMS Provider

1. Create `/src/lib/auth/server/cms/providers/strapi.ts`
2. Implement `CMSProvider` interface
3. Add to factory in `/src/lib/auth/server/cms/index.ts`
4. Add environment variables to the env schemas under `src/lib/auth/shared/env/`
5. Add documentation

### Adding a New Email Provider

1. Create `/src/lib/auth/server/email/providers/sendgrid.ts`
2. Implement email sending logic
3. Update email service to support new provider
4. Add environment variables
5. Add documentation

### Adding a New Auth Plugin

1. Create plugin in `/src/lib/auth/server/plugins/`
2. Add to `buildPlugins()` function
3. Add client-side plugin if needed
4. Add documentation

## Deployment

### Environment Setup

```bash
# Copy example env
cp .env.example .env

# Fill in required variables
BETTER_AUTH_SECRET=your-secret-key
BETTER_DATABASE_URL=postgresql://...
PUBLIC_DIRECTUS_URL=https://your-directus.com
EMAIL_API_KEY=your-api-key
```

### Database Migrations

```bash
bun run auth:migrate
```

### Build and Deploy

```bash
bun run build
bun run preview
```

## Troubleshooting

### CMS Provider Not Connecting

1. Check `PUBLIC_DIRECTUS_URL` is correct
2. Verify `DIRECTUS_ADMIN_TOKEN` is valid
3. Run health check: `await cms.healthCheck()`
4. Check logs for detailed error messages

### Email Not Sending

1. Verify `EMAIL_API_KEY` is valid
2. Check `USESEND_EMAIL_FROM` is correct
3. Check email templates in `/src/lib/auth/server/email/emails/`
4. Check logs for delivery errors

### Authentication Issues

1. Verify `BETTER_AUTH_SECRET` is at least 32 characters
2. Check database connection with `BETTER_DATABASE_URL`
3. Verify session cookies are being set
4. Check browser console for client-side errors
