# Shared infrastructure

Feature modules depend on this folder for shared runtime services. Platform code must not import modules or application policy. Copy the infrastructure a module uses alongside that module when moving it to another application.

## Entry points

| Entry | Purpose | Runtime |
| --- | --- | --- |
| `config/index.ts` | Validated public configuration and environment helpers | Browser and server |
| `config/server.server.ts` | Private configuration, cache management and safe diagnostics | Server only |
| `cms/index.ts`, `cms/types.ts` | CMS contracts | Type-only imports |
| `cms/server.server.ts` | CMS factory and shared provider lifecycle | Server only |
| `cms/service.ts` | CMS user, avatar and health operations | Server only |
| `storage/index.ts`, `storage/types.ts` | Storage contracts | Type-only imports |
| `storage/server.server.ts` | Storage factory and shared provider lifecycle | Server only |
| `storage/service.ts` | File upload and management operations | Server only |
| `database/db.ts` | Database access and transactions | Server only |
| `redis/index.ts` | Shared Redis connections | Server only |
| `logger.ts` | Logging helpers | Browser and server |

Use `.server` entry points for private configuration and provider factories. Their names allow SvelteKit to reject browser imports. Import CMS and storage types with `import type` from their public roots or `types.ts` files. The remaining database, Redis and service implementations are server infrastructure and should only be imported by server code.

## Host setup

- Preserve the host's `#lib/*` alias, or update imports when copying this folder.
- Declare public environment values in the host's `src/env.ts`. `config/env.ts` reads SvelteKit's `$app/env/public` values and preserves their precedence over process values so browser and server agree.
- Supply the private environment values required by `config/env-schema.ts`. Async server configuration loads local dotenv files when Node is available and otherwise uses the runtime's private environment.
- The current schema still includes this application's auth, billing and tenancy settings. Review and adapt that schema when copying infrastructure into a different app; each module README lists its own setup requirements.
- Initialize CMS or storage providers before calling their shared service functions. Auth currently configures the CMS provider during auth setup.

## Packages

Configuration uses `zod` and, for local Node environments, `dotenv`. Logging uses `consola`. Database access uses `pg`; Redis access uses `redis`. The Directus provider uses `@directus/sdk` and the project's local `better-auth-directus` package. Carry that local dependency when copying the provider, or supply another provider implementation. Check each provider's imports before selecting a different backend; provider support is intentionally explicit and unsupported options throw an error.
