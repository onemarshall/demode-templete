# Environment Validation

How environment variables are validated and consumed in this project.

## Overview

The project uses **Zod schemas** to validate all environment variables at startup. This ensures:

- ✅ **Type Safety** - All environment variables are properly typed
- ✅ **Early Failure** - Invalid configuration is caught before the server starts
- ✅ **Clear Error Messages** - Validation errors show exactly what's wrong
- ✅ **Security** - Sensitive values are redacted in logs
- ✅ **Documentation** - Each variable has a description

## Files

### Core Files

- **`src/lib/auth/shared/env/env-schema.ts`** - Zod schemas and validation functions
- **`src/lib/auth/shared/env/env.ts`** - Environment variable access

## Environment Schemas

### Public Environment Variables

Safe to expose to the client. Defined in `publicEnvSchema`:

```typescript
PUBLIC_APP_NAME; // Application name
PUBLIC_SITE_URL; // Main site URL
PUBLIC_ENV_MODE; // development | production | staging
PUBLIC_AUTH_URL; // Authentication service URL
PUBLIC_AUTH_DEBUG_MODE; // Enable auth debug logging
PUBLIC_DIRECTUS_URL; // Directus CMS URL
PUBLIC_AUTH_PASSKEY_RPID; // WebAuthn RP ID (domain) — server only, derived from the canonical URL when unset
PUBLIC_AUTH_PASSKEY_ORIGIN; // WebAuthn origin URL — server only, comma separated list, defaults to the request origin
PUBLIC_AUTH_PASSKEY_RP_NAME; // WebAuthn RP name
PUBLIC_AUTH_PASSKEY_TIMEOUT; // WebAuthn timeout (ms)
PUBLIC_CAP_URL; // CAPTCHA URL
PUBLIC_CAP_KEY; // CAPTCHA API key
PUBLIC_IPINFO_GEOLOCATION_API_KEY; // Geolocation API key
```

### Server Environment Variables

Never exposed to client. Defined in `serverEnvSchema`:

#### Required Variables

```typescript
BETTER_AUTH_SECRET; // Min 32 chars - session encryption
BETTER_DATABASE_URL; // PostgreSQL connection URL
DIRECTUS_DRAFT_MODE_SECRET; // Min 32 chars
DIRECTUS_FORM_TOKEN; // Min 32 chars
DIRECTUS_ADMIN_TOKEN; // Min 32 chars
DIRECTUS_DEFAULT_ROLE_ID; // UUID format
REDIS_HOST; // Redis hostname
REDIS_PORT; // Redis port (number)
REDIS_DB; // Redis database (number)
```

#### Optional Variables

```typescript
// Email Configuration
EMAIL_PROVIDER; // usesend | resend | sendgrid | smtp | mock
EMAIL_API_KEY; // Email service API key
EMAIL_FROM; // Sender email address
EMAIL_FROM_NAME; // Sender display name
EMAIL_REPLY_TO; // Reply-to address
EMAIL_TO; // Test recipient

// OAuth Providers
GITHUB_CLIENT_ID; // GitHub OAuth
GITHUB_CLIENT_SECRET;
GOOGLE_CLIENT_ID; // Google OAuth
GOOGLE_CLIENT_SECRET;
LINKEDIN_CLIENT_ID; // LinkedIn OAuth
LINKEDIN_CLIENT_SECRET;
TWITTER_CLIENT_ID; // Twitter OAuth
TWITTER_CLIENT_SECRET;

// Storage Configuration
STORAGE_PROVIDER; // local | s3 | cloudinary | mock
STORAGE_UPLOAD_DIR; // Upload directory
STORAGE_BASE_URL; // Storage base URL
LOCAL_STORAGE_PATH; // Local storage path
S3_REGION; // AWS S3 region
S3_BUCKET; // AWS S3 bucket
S3_ACCESS_KEY_ID; // AWS S3 access key
S3_SECRET_ACCESS_KEY; // AWS S3 secret key
S3_ENDPOINT; // AWS S3 custom endpoint

// Cloudinary
CLOUDINARY_CLOUD_NAME; // Cloudinary cloud name
CLOUDINARY_API_KEY; // Cloudinary API key
CLOUDINARY_API_SECRET; // Cloudinary API secret
CLOUDINARY_FOLDER; // Cloudinary folder

// CMS Configuration
CMS_PROVIDER; // directus | strapi | payload | sanity
PUBLIC_CMS_URL; // CMS service URL
CMS_API_TOKEN; // CMS API token

// CAPTCHA Configuration
CAP_STANDALONE_URL; // CAPTCHA URL
CAP_STANDALONE_API; // CAPTCHA API endpoint
CAP_STANDALONE_KEY; // CAPTCHA API key

// Redis
REDIS_PASSWORD; // Redis password (optional)
REDIS_URL; // Redis connection URL (alternative)
```

## Usage

### Validating Environment Variables

```typescript
import { validateEnv, serverEnvSchema } from '#lib/shared/config/env-schema';

// Validate and get typed environment object
const env = validateEnv(process.env, serverEnvSchema, 'Server');

// env is now fully typed with autocomplete support
console.log(env.BETTER_AUTH_SECRET);
console.log(env.BETTER_DATABASE_URL);
```

### Startup Validation

Call this in your server initialization to validate all environment variables:

```typescript
// In your server startup code, call the env loader early.
// See: src/lib/auth/shared/env/env.ts
```

### Feature Detection

Check if optional features are configured:

```typescript
import {
	isFeatureEnabled,
	getConfiguredOAuthProviders,
	getStorageProvider,
	getCMSProvider,
	getEmailProvider,
	isRedisConfigured,
	isDevelopmentMode,
	isProductionMode
} from '#lib/auth/shared/env/index.js';

// Check specific features
if (isFeatureEnabled('GITHUB_CLIENT_ID')) {
	// GitHub OAuth is configured
}

// Get configured providers
const oauthProviders = getConfiguredOAuthProviders();
// Returns: ['github', 'google']

const storage = getStorageProvider();
// Returns: 's3' or 'mock'

const cms = getCMSProvider();
// Returns: 'directus' or 'strapi'

const email = getEmailProvider();
// Returns: 'usesend' or 'mock'

if (isRedisConfigured()) {
	// Redis is available
}

if (isDevelopmentMode()) {
	// In development
}

if (isProductionMode()) {
	// In production
}
```

### Getting Safe Log Output

Redact sensitive values for logging:

```typescript
import { getSafeEnvLog } from '#lib/shared/config/env-schema';

const safeEnv = getSafeEnvLog(process.env);
// Sensitive keys are redacted: [REDACTED:string:32chars]
logger.info('Environment:', safeEnv);
```

## Error Messages

When validation fails, you get clear error messages:

```
❌ Server Startup environment validation failed:

  • BETTER_AUTH_SECRET: Must be at least 32 characters for security
  • BETTER_DATABASE_URL: Database URL is required
  • DIRECTUS_ADMIN_TOKEN: Must be at least 32 characters for security

Please check your .env file and ensure all required variables are set correctly.
```

## Security

### Sensitive Keys

The following keys are automatically redacted in logs:

- `BETTER_AUTH_SECRET`
- `BETTER_DATABASE_URL`
- `EMAIL_API_KEY`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `LINKEDIN_CLIENT_SECRET`
- `TWITTER_CLIENT_SECRET`
- `DIRECTUS_DRAFT_MODE_SECRET`
- `DIRECTUS_FORM_TOKEN`
- `DIRECTUS_ADMIN_TOKEN`
- `REDIS_PASSWORD`
- `S3_SECRET_ACCESS_KEY`
- `CLOUDINARY_API_SECRET`
- `CAP_STANDALONE_KEY`

### Best Practices

1. **Never log raw environment variables** - Use `getSafeEnvLog()` instead
2. **Use strong secrets** - Minimum 32 characters for security-sensitive values
3. **Validate on startup** - Call `validateServerEnvOnStartup()` early
4. **Use `.env.example`** - Document all required variables
5. **Keep secrets in `.env`** - Never commit `.env` to version control

## Example .env File

```bash
# Application
PUBLIC_APP_NAME="My App"
PUBLIC_SITE_URL="http://localhost:3000"
PUBLIC_ENV_MODE="development"
PUBLIC_AUTH_URL="http://localhost:3000"

# Authentication
BETTER_AUTH_SECRET="your-secret-key-min-32-characters-long"
BETTER_DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Directus
PUBLIC_DIRECTUS_URL="http://localhost:8051"
DIRECTUS_ADMIN_TOKEN="your-admin-token-min-32-characters"
DIRECTUS_DRAFT_MODE_SECRET="your-draft-secret-min-32-characters"
DIRECTUS_FORM_TOKEN="your-form-token-min-32-characters"
DIRECTUS_DEFAULT_ROLE_ID="00000000-0000-0000-0000-000000000000"

# Email
EMAIL_PROVIDER="usesend"
EMAIL_API_KEY="your-api-key"
EMAIL_FROM="noreply@example.com"
EMAIL_FROM_NAME="My App"

# OAuth (Optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_DB="0"

# Storage
STORAGE_PROVIDER="local"
STORAGE_UPLOAD_DIR="./uploads"

# CMS
CMS_PROVIDER="directus"
```

## Testing

To test environment validation:

```typescript
import { validateEnv, serverEnvSchema } from '#lib/shared/config/env-schema';

// Test valid environment
const validEnv = {
	BETTER_AUTH_SECRET: 'a'.repeat(32),
	BETTER_DATABASE_URL: 'postgresql://localhost/test'
	// ... other required vars
};

const result = validateEnv(validEnv, serverEnvSchema, 'Test');
console.log('Validation passed:', result);

// Test invalid environment
try {
	validateEnv({ BETTER_AUTH_SECRET: 'short' }, serverEnvSchema, 'Test');
} catch (error) {
	console.error('Validation failed:', error.message);
}
```

## Migration Guide

If you're updating from the old environment system:

1. **Old**: Direct `process.env` access

   ```typescript
   const secret = process.env.BETTER_AUTH_SECRET; // any type
   ```

2. **New**: Use validated schemas

   ```typescript
   import { validateEnv, serverEnvSchema } from '#lib/shared/config/env-schema';
   const env = validateEnv(process.env, serverEnvSchema, 'Server');
   const secret = env.BETTER_AUTH_SECRET; // typed string
   ```

3. **Startup**: Add validation check
   ```typescript
   import { validateServerEnvOnStartup } from '#lib/server/utils/env-startup-check';
   const env = validateServerEnvOnStartup();
   ```

## Troubleshooting

### "Must be at least 32 characters for security"

Your secret is too short. Generate a new one:

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### "Must be a valid UUID"

The value is not a valid UUID format. Use a proper UUID:

```bash
# Using uuidgen (macOS/Linux)
uuidgen

# Using Node.js
node -e "console.log(require('crypto').randomUUID())"
```

### "Must be a valid URL"

The URL format is incorrect. Examples:

```
✅ http://localhost:3000
✅ https://example.com
✅ postgresql://user:pass@host:5432/db
❌ localhost:3000 (missing protocol)
❌ http://example.com:abc (invalid port)
```

## See Also

- [Zod Documentation](https://zod.dev/)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Security Architecture](../architecture/security.md)
