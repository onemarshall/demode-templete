# Shared Redis Client

The Better Auth security stack uses a single shared Redis connection manager rather than letting each plugin open its own pool.

## Overview

All security plugins share a managed Redis pool, which:

- Reduces the number of Redis connections
- Provides consistent error handling and reconnection logic
- Enables graceful shutdown across all plugins
- Simplifies configuration (single `REDIS_URL` environment variable)

## Installation

### 1. Install Redis Package

```bash
npm install redis
# or
pnpm add redis
# or
yarn add redis
```

### 2. Import the Utils

Import from the shared utilities:

```typescript
import { getSharedRedisClient } from '$lib/auth/shared/redis';
```

### 3. Set Environment Variable

```env
# .env
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://user:password@localhost:6379

# Redis Cloud / Upstash / etc.
REDIS_URL=rediss://user:password@your-redis-host:6379
```

## Usage

### In Plugin Service Files

Each plugin has a `services/redis.ts` file that imports from the shared utils:

```typescript
// src/lib/server/auth/security/plugins/abuse-protection/services/redis.ts

import { getSharedRedisClient, type ManagedRedisClient } from '$lib/server/auth/security/utils';

let redisClient: ManagedRedisClient | null = null;

/**
 * Get Redis client for this plugin
 */
export async function getRedis(): Promise<ManagedRedisClient> {
	if (!redisClient) {
		redisClient = await getSharedRedisClient('AbuseProtectionPlugin');
	}
	return redisClient;
}

/**
 * Reset Redis client (for testing)
 */
export function resetRedisClient(): void {
	redisClient = null;
}
```

### In hooks.server.ts (Shutdown Cleanup)

```typescript
// src/hooks.server.ts

import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { logger } from '$lib/auth/shared/logger';

declare global {
	var cleanupRegistered: boolean | undefined;
}

const cleanupHook: Handle = async ({ event, resolve }) => {
	if (!globalThis.cleanupRegistered) {
		const cleanup = async () => {
			logger.info('[Cleanup] Shutting down gracefully...');
			try {
				const { closeAllRedisClients } = await import('$lib/server/auth/security/utils');
				await closeAllRedisClients();
				logger.info('[Cleanup] All Redis connections closed');
			} catch (err) {
				logger.error('[Cleanup] Error during shutdown:', err);
			}
			process.exit(0);
		};

		process.on('SIGTERM', cleanup);
		process.on('SIGINT', cleanup);
		globalThis.cleanupRegistered = true;
	}

	return resolve(event);
};

export const handle = sequence(cleanupHook /* other hooks */);
```

### Health Check Endpoint (Optional)

```typescript
// src/routes/api/health/+server.ts

import { json } from '@sveltejs/kit';
import { healthCheck, getActiveClientNames } from '$lib/server/auth/security/utils';

export async function GET() {
	const redisHealth = await healthCheck();
	const activeClients = getActiveClientNames();

	return json({
		status: 'ok',
		redis: {
			clients: activeClients,
			health: redisHealth
		}
	});
}
```

## API Reference

### Functions

| Function                               | Description                        |
| -------------------------------------- | ---------------------------------- |
| `getSharedRedisClient(name, options?)` | Get or create a named Redis client |
| `closeRedisClient(name)`               | Close a specific client            |
| `closeAllRedisClients()`               | Close all clients (for shutdown)   |
| `isClientConnected(name)`              | Check if a client is connected     |
| `getActiveClientCount()`               | Get number of active clients       |
| `getActiveClientNames()`               | Get names of all active clients    |
| `healthCheck()`                        | Ping all clients and return status |

### Types

```typescript
// Redis client type (from 'redis' package)
type ManagedRedisClient = RedisClientType;

// Configuration options
interface RedisClientOptions {
	url?: string; // Redis URL (default: REDIS_URL env or localhost)
	maxReconnectAttempts?: number; // Max retries (default: 10)
	reconnectBaseDelay?: number; // Initial retry delay ms (default: 100)
	reconnectMaxDelay?: number; // Max retry delay ms (default: 3000)
}
```

## Which Plugins Use This?

All security plugins import from this shared utility:

| Plugin             | Client Name               |
| ------------------ | ------------------------- |
| Abuse Protection   | `AbuseProtectionPlugin`   |
| Fraud Detection    | `FraudDetectionPlugin`    |
| Geo Intelligence   | `GeoIntelligencePlugin`   |
| Rate Limiting      | `RateLimitPlugin`         |
| Security Analytics | `SecurityAnalyticsPlugin` |

## Redis Key Namespaces

Each plugin uses its own key prefix to avoid collisions:

| Plugin             | Key Prefix Examples                                       |
| ------------------ | --------------------------------------------------------- |
| Abuse Protection   | `abuse:*`, `captcha_bypass:*`, `block:*`                  |
| Fraud Detection    | `fraud_analysis:*`, `device_trust:*`                      |
| Geo Intelligence   | `geo_location:*`, `ip_reputation:*`, `geo_intelligence:*` |
| Rate Limiting      | `ratelimit:*`                                             |
| Security Analytics | `security_alert:*`, `blocked_ip:*`, `trusted_device:*`    |

## Error Handling

The shared client handles common Redis errors:

- **Connection failures**: Automatic reconnection with exponential backoff
- **Max retries exceeded**: Throws error after configured attempts
- **Stale connections**: Automatically replaced on next `getSharedRedisClient` call

```typescript
try {
	const redis = await getSharedRedisClient('MyPlugin');
	await redis.set('key', 'value');
} catch (error) {
	if (error.message.includes('Max reconnection attempts')) {
		// Redis is unavailable - handle gracefully
		console.error('Redis unavailable, using fallback');
	}
}
```

## Testing

For testing, you can reset individual plugin clients:

```typescript
// In your test file
import { resetRedisClient } from '$lib/server/auth/security/plugins/abuse-protection/services/redis';

beforeEach(() => {
	resetRedisClient();
});
```

Or close all clients between test suites:

```typescript
import { closeAllRedisClients } from '$lib/server/auth/security/utils';

afterAll(async () => {
	await closeAllRedisClients();
});
```

## Troubleshooting

### "ECONNREFUSED" Error

Redis server is not running:

```bash
# Start Redis locally
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

### "Max reconnection attempts reached"

Redis server is unreachable. Check:

1. `REDIS_URL` is correct
2. Redis server is running
3. Firewall allows connection
4. Network connectivity

### Memory Issues

If you're seeing high memory usage, check for key accumulation:

```bash
# In redis-cli
INFO memory
DBSIZE
KEYS abuse:*  # Check key counts per namespace
```

Consider setting TTLs on all keys (which the plugins do by default).
