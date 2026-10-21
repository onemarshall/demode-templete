# Retry Logic

Reference for the resilient retry helpers (exponential backoff with jitter) used across the codebase.

## Overview

The retry system provides:

- ✅ Exponential backoff with jitter
- ✅ Configurable retry attempts
- ✅ Retryable error detection
- ✅ Async and sync support
- ✅ Retry presets
- ✅ Rich logging

## Core Concepts

### Exponential Backoff

Delays increase exponentially between retries to avoid overwhelming a struggling service:

```bash
Attempt 1: Immediate
Attempt 2: 1 second
Attempt 3: 2 seconds
Attempt 4: 4 seconds
Attempt 5: 8 seconds
```

### Jitter

Random variation added to delays to prevent "thundering herd" when multiple clients retry simultaneously:

```
Delay = baseDelay ± (baseDelay × jitterFactor)
```

### Retryable Errors

Only transient errors are retried. Permanent errors fail immediately:

**Retryable:**

- Connection refused
- Connection reset
- Timeout
- Host unreachable
- HTTP 429 (Too many requests)
- HTTP 503 (Service unavailable)
- HTTP 504 (Gateway timeout)

**Not Retryable:**

- HTTP 400 (Bad request)
- HTTP 401 (Unauthorized)
- HTTP 403 (Forbidden)
- HTTP 404 (Not found)

## Usage

### Basic Retry

```typescript
import { retry } from '#lib/server/utils/retry';

const result = await retry(async () => await directusService.syncUser(user), {
	maxAttempts: 3,
	initialDelayMs: 1000,
	context: { userId: user.id }
});
```

### Using Presets

```typescript
import { retry, RETRY_PRESETS } from '#lib/server/utils/retry';

// Aggressive retry - 5 attempts, up to 60 seconds
const result = await retry(async () => await directusService.syncUser(user), {
	...RETRY_PRESETS.aggressive,
	context: { userId: user.id }
});

// Standard retry - 3 attempts, up to 30 seconds
const result = await retry(async () => await directusService.syncUser(user), {
	...RETRY_PRESETS.standard,
	context: { userId: user.id }
});

// Conservative retry - 2 attempts, up to 10 seconds
const result = await retry(async () => await directusService.syncUser(user), {
	...RETRY_PRESETS.conservative,
	context: { userId: user.id }
});

// Quick retry - 2 attempts, up to 5 seconds
const result = await retry(async () => await directusService.syncUser(user), {
	...RETRY_PRESETS.quick,
	context: { userId: user.id }
});
```

### Retry Wrapper

```typescript
import { withRetry } from '#lib/server/utils/retry';

// Create a wrapped function
const syncWithRetry = withRetry(async (user) => await directusService.syncUser(user), {
	maxAttempts: 3
});

// Use it multiple times
await syncWithRetry(user1);
await syncWithRetry(user2);
```

### Custom Retryable Check

```typescript
import { retry } from '#lib/server/utils/retry';

const result = await retry(async () => await someOperation(), {
	maxAttempts: 3,
	isRetryable: (error) => {
		// Custom logic
		if (error instanceof CustomError) {
			return error.isTransient;
		}
		return false;
	}
});
```

### Synchronous Retry

```typescript
import { retrySyncWithBackoff } from '#lib/server/utils/retry';

const result = retrySyncWithBackoff(() => JSON.parse(data), { maxAttempts: 2 });
```

## Configuration

### RetryOptions

```typescript
interface RetryOptions {
	maxAttempts?: number; // Default: 3
	initialDelayMs?: number; // Default: 1000
	maxDelayMs?: number; // Default: 30000
	backoffMultiplier?: number; // Default: 2
	jitterFactor?: number; // Default: 0.1 (0-1)
	isRetryable?: (error) => boolean;
	context?: Record<string, unknown>;
}
```

### Presets

| Preset         | Attempts | Initial | Max | Use Case            |
| -------------- | -------- | ------- | --- | ------------------- |
| `aggressive`   | 5        | 500ms   | 60s | Critical operations |
| `standard`     | 3        | 1s      | 30s | Normal operations   |
| `conservative` | 2        | 1s      | 10s | Quick operations    |
| `quick`        | 2        | 500ms   | 5s  | Fast operations     |

## Real-World Examples

### Directus Sync with Retry

```typescript
import { retry, RETRY_PRESETS } from '#lib/server/utils/retry';

export class DirectusUserService {
	async syncUser(user: BetterAuthUser) {
		return retry(
			async () => {
				// Sync logic
				const existingUser = await this.findUser({ email: user.email });
				if (existingUser) {
					return await this.updateUser(existingUser, user);
				}
				return await this.createUser(user);
			},
			{
				...RETRY_PRESETS.standard,
				context: {
					operation: 'syncUser',
					userId: user.id,
					email: user.email
				}
			}
		);
	}

	async uploadAvatar(userId: string, fileUrl: string) {
		return retry(
			async () => {
				// Upload logic
				const response = await fetch(fileUrl);
				const buffer = await response.arrayBuffer();
				return await this.uploadToDirectus(buffer);
			},
			{
				...RETRY_PRESETS.aggressive,
				context: {
					operation: 'uploadAvatar',
					userId
				}
			}
		);
	}
}
```

### API Route with Retry

```typescript
import { json } from '@sveltejs/kit';
import { retry, RETRY_PRESETS } from '#lib/server/utils/retry';
import { handleError } from '#lib/server/utils/error-handler';

export async function POST({ request }) {
	try {
		const data = await request.json();

		const result = await retry(
			async () => {
				// API call with retry
				const response = await fetch('https://api.example.com/sync', {
					method: 'POST',
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				return await response.json();
			},
			{
				...RETRY_PRESETS.standard,
				context: { endpoint: '/api/sync' }
			}
		);

		return json(result);
	} catch (error) {
		const response = handleError(error, { route: '/api/sync' });
		return json(response, { status: response.statusCode });
	}
}
```

### Server Action with Retry

```typescript
import { fail } from '@sveltejs/kit';
import { retry, RETRY_PRESETS } from '#lib/server/utils/retry';
import { handleError } from '#lib/server/utils/error-handler';

export const actions = {
	syncUser: async ({ request }) => {
		try {
			const data = await request.formData();
			const userId = data.get('userId') as string;

			const result = await retry(
				async () => {
					// Sync with retry
					const user = await getUser(userId);
					return await directusService.syncUser(user);
				},
				{
					...RETRY_PRESETS.standard,
					context: { action: 'syncUser', userId }
				}
			);

			return { success: true, data: result };
		} catch (error) {
			const response = handleError(error, { action: 'syncUser' });
			return fail(response.statusCode, response);
		}
	}
};
```

## Logging

Retry operations are automatically logged:

```
[INFO] Attempting operation (attempt 1/3) { userId: '123' }
[WARN] Retryable error, retrying in 1000ms { error: 'Connection timeout', attempt: 1, nextAttemptIn: 1000 }
[WARN] Retryable error, retrying in 2000ms { error: 'Connection timeout', attempt: 2, nextAttemptIn: 2000 }
[INFO] Attempting operation (attempt 3/3) { userId: '123' }
[SUCCESS] Operation completed successfully
```

## Error Handling

### Retryable vs Non-Retryable

```typescript
import { retry, isRetryableError } from '#lib/server/utils/retry';

try {
	await retry(async () => {
		// operation
	});
} catch (error) {
	if (isRetryableError(error)) {
		// This shouldn't happen - all retries were exhausted
		console.error('All retries failed for transient error');
	} else {
		// Permanent error - failed immediately
		console.error('Non-retryable error:', error);
	}
}
```

### Custom Error Detection

```typescript
class CustomError extends Error {
	constructor(
		message: string,
		public isTransient: boolean
	) {
		super(message);
	}
}

const result = await retry(
	async () => {
		// operation that might throw CustomError
	},
	{
		isRetryable: (error) => {
			if (error instanceof CustomError) {
				return error.isTransient;
			}
			return false;
		}
	}
);
```

## Best Practices

### 1. Use Appropriate Presets

✅ **Good:**

```typescript
// Critical operation - use aggressive
await retry(criticalOp, RETRY_PRESETS.aggressive);

// Quick operation - use quick
await retry(quickOp, RETRY_PRESETS.quick);
```

❌ **Bad:**

```typescript
// Using aggressive for quick operation wastes time
await retry(quickOp, RETRY_PRESETS.aggressive);
```

### 2. Include Context

✅ **Good:**

```typescript
await retry(operation, {
	context: {
		operation: 'syncUser',
		userId: user.id,
		email: user.email
	}
});
```

❌ **Bad:**

```typescript
await retry(operation); // No context for debugging
```

### 3. Handle Non-Retryable Errors Immediately

✅ **Good:**

```typescript
try {
	await retry(operation, { maxAttempts: 3 });
} catch (error) {
	if (!isRetryableError(error)) {
		// Non-retryable error - handle immediately
		return handleError(error);
	}
	// Retryable error - all retries exhausted
	throw error;
}
```

### 4. Don't Retry Everything

✅ **Good:**

```typescript
// Only retry Directus sync (external service)
await retry(async () => await directusService.syncUser(user), RETRY_PRESETS.standard);

// Don't retry validation (local operation)
validateUser(user); // No retry needed
```

### 5. Set Reasonable Limits

✅ **Good:**

```typescript
// 3 attempts, max 30 seconds
RETRY_PRESETS.standard;
```

❌ **Bad:**

```typescript
// Too many attempts, too long to wait
{ maxAttempts: 10, maxDelayMs: 300000 }
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { retry, isRetryableError } from '#lib/server/utils/retry';

describe('Retry Logic', () => {
	it('retries on transient errors', async () => {
		let attempts = 0;
		const fn = vi.fn(async () => {
			attempts++;
			if (attempts < 3) {
				throw new Error('ECONNREFUSED');
			}
			return 'success';
		});

		const result = await retry(fn, { maxAttempts: 3 });
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('fails immediately on non-retryable errors', async () => {
		const fn = vi.fn(async () => {
			throw new Error('Invalid input');
		});

		await expect(retry(fn, { maxAttempts: 3 })).rejects.toThrow('Invalid input');

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('detects retryable errors', () => {
		expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
		expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
		expect(isRetryableError(new Error('Invalid input'))).toBe(false);
	});
});
```

## Performance Considerations

### Delay Calculation

```
Attempt 1: 0ms (immediate)
Attempt 2: 1000ms ± 100ms
Attempt 3: 2000ms ± 200ms
Attempt 4: 4000ms ± 400ms
Attempt 5: 8000ms ± 800ms (capped at 30000ms)
```

### Total Time

**Standard preset (3 attempts):**

- Best case: ~3 seconds
- Worst case: ~33 seconds

**Aggressive preset (5 attempts):**

- Best case: ~15 seconds
- Worst case: ~63 seconds

## See Also

- [Error Handling](./error-handling.md)
- [Environment Validation](./environment.md)
- [Auth Module Layout](../architecture/auth-module.md)
