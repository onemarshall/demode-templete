# Error Handling

Reference for the consistent error-handling patterns used across the application.

## Overview

The error handling system provides:

- ✅ Centralized error handling
- ✅ Consistent error logging
- ✅ User-friendly error messages
- ✅ Error categorization
- ✅ Severity levels
- ✅ Structured error responses

## Error Classes

### AppError

Custom error class with structured information:

```typescript
class AppError extends Error {
	category: ErrorCategory;
	severity: ErrorSeverity;
	statusCode: number;
	userMessage: string;
	context?: Record<string, unknown>;
}
```

## Error Categories

| Category           | Status | Description             |
| ------------------ | ------ | ----------------------- |
| `VALIDATION`       | 400    | Input validation failed |
| `AUTHENTICATION`   | 401    | Authentication failed   |
| `AUTHORIZATION`    | 403    | Permission denied       |
| `NOT_FOUND`        | 404    | Resource not found      |
| `CONFLICT`         | 409    | Resource conflict       |
| `RATE_LIMIT`       | 429    | Too many requests       |
| `EXTERNAL_SERVICE` | 503    | External service error  |
| `DATABASE`         | 500    | Database error          |
| `UNKNOWN`          | 500    | Unknown error           |

## Error Severity Levels

| Level      | Usage                                                 |
| ---------- | ----------------------------------------------------- |
| `LOW`      | Non-critical, expected errors (validation, not found) |
| `MEDIUM`   | Standard errors (auth, conflicts)                     |
| `HIGH`     | Serious errors (database, external service)           |
| `CRITICAL` | System-breaking errors (missing config)               |

## Usage Examples

### Basic Error Handling

```typescript
import { handleError } from '#lib/server/utils/error-handler';

try {
	// some operation
} catch (error) {
	const response = handleError(error, { operation: 'user_update' });
	return fail(response.statusCode, response);
}
```

### Creating Specific Errors

```typescript
import {
	createValidationError,
	createAuthError,
	createNotFoundError,
	createConflictError
} from '#lib/server/utils/error-handler';

// Validation error
throw createValidationError('Email is required', { field: 'email' });

// Authentication error
throw createAuthError('Invalid credentials', { attempt: 1 });

// Not found error
throw createNotFoundError('User', userId);

// Conflict error
throw createConflictError('Email already exists', { email });
```

### Wrapping Async Functions

```typescript
import { withErrorHandling } from '#lib/server/utils/error-handler';

const safeSync = withErrorHandling(async () => await directusService.syncUser(user), {
	operation: 'user_sync',
	userId: user.id
});

try {
	await safeSync();
} catch (error) {
	// Error already logged
}
```

### Environment Validation

```typescript
import { validateRequiredEnv } from '#lib/server/utils/error-handler';

// Throws AppError if any variable is missing
validateRequiredEnv(['DIRECTUS_ADMIN_TOKEN', 'BETTER_AUTH_SECRET'], 'DirectusUserService');
```

## Error Factory Functions

### createValidationError

```typescript
throw createValidationError('Invalid email format', { field: 'email', value: input });
```

### createAuthError

```typescript
throw createAuthError('Invalid credentials', { attempt: 1, ip: request.ip });
```

### createAuthzError

```typescript
throw createAuthzError('User does not have admin role', { userId, requiredRole: 'admin' });
```

### createNotFoundError

```typescript
throw createNotFoundError('User', userId);
// Message: "User not found: abc123"
```

### createConflictError

```typescript
throw createConflictError('Email already exists', { email: 'user@example.com' });
```

### createRateLimitError

```typescript
throw createRateLimitError(60); // Retry after 60 seconds
```

### createExternalServiceError

```typescript
throw createExternalServiceError('Directus', 'Connection timeout', {
	url: 'http://localhost:8051',
	timeout: 5000
});
```

### createDatabaseError

```typescript
throw createDatabaseError('Query failed', { query: 'SELECT...', code: 'ECONNREFUSED' });
```

## Error Response Format

All errors are converted to a consistent response format:

```typescript
{
  statusCode: 400,
  error: "Email is required",
  userMessage: "The provided data is invalid. Please check your input.",
  category: "validation"
}
```

## Logging

Errors are automatically logged based on severity:

- **CRITICAL**: `securityLogger.error()` - System-breaking errors
- **HIGH**: `securityLogger.warn()` - Serious errors
- **MEDIUM/LOW**: `logger.warn()` - Standard errors

### Log Context

All errors include context:

```typescript
{
  operation: 'user_update',
  userId: '123',
  category: 'validation',
  severity: 'low'
}
```

## Server Action Example

```typescript
import { fail } from '@sveltejs/kit';
import { handleError, createValidationError } from '#lib/server/utils/error-handler';

export const actions = {
	updateUser: async ({ request }) => {
		try {
			const data = await request.formData();
			const email = data.get('email');

			if (!email) {
				throw createValidationError('Email is required', { field: 'email' });
			}

			// Update user...

			return { success: true };
		} catch (error) {
			const response = handleError(error, { action: 'updateUser' });
			return fail(response.statusCode, response);
		}
	}
};
```

## API Route Example

```typescript
import { json } from '@sveltejs/kit';
import { handleError, createNotFoundError } from '#lib/server/utils/error-handler';

export async function GET({ params }) {
	try {
		const user = await getUser(params.id);

		if (!user) {
			throw createNotFoundError('User', params.id);
		}

		return json(user);
	} catch (error) {
		const response = handleError(error, { route: '/api/users/[id]' });
		return json(response, { status: response.statusCode });
	}
}
```

## Service Layer Example

```typescript
import { createExternalServiceError, createDatabaseError } from '#lib/server/utils/error-handler';

export class DirectusUserService {
	async syncUser(user: BetterAuthUser) {
		try {
			const response = await fetch(`${env.PUBLIC_DIRECTUS_URL}/users`, {
				method: 'POST',
				body: JSON.stringify(user)
			});

			if (!response.ok) {
				throw createExternalServiceError('Directus', `HTTP ${response.status}`, {
					url: env.PUBLIC_DIRECTUS_URL,
					status: response.status
				});
			}

			return await response.json();
		} catch (error) {
			if (error instanceof AppError) throw error;

			throw createDatabaseError('Failed to sync user to Directus', { userId: user.id });
		}
	}
}
```

## Client-Side Handling

```typescript
// In a Svelte component
async function handleSubmit() {
	try {
		const response = await fetch('/api/users', {
			method: 'POST',
			body: JSON.stringify(data)
		});

		const result = await response.json();

		if (!response.ok) {
			// result contains: statusCode, error, userMessage, category
			errorMessage = result.userMessage;
			return;
		}

		// Success
	} catch (error) {
		errorMessage = 'Network error. Please try again.';
	}
}
```

## Best Practices

### 1. Use Specific Error Creators

✅ **Good:**

```typescript
throw createValidationError('Email is required', { field: 'email' });
```

❌ **Bad:**

```typescript
throw new Error('Email is required');
```

### 2. Include Context

✅ **Good:**

```typescript
throw createNotFoundError('User', userId);
```

❌ **Bad:**

```typescript
throw createNotFoundError('User');
```

### 3. Log Errors Consistently

✅ **Good:**

```typescript
const response = handleError(error, { operation: 'user_sync' });
```

❌ **Bad:**

```typescript
console.error(error);
```

### 4. Provide User-Friendly Messages

✅ **Good:**

```typescript
throw createValidationError('Invalid email format', { field: 'email' });
// userMessage: "The provided data is invalid. Please check your input."
```

❌ **Bad:**

```typescript
throw new Error('Email validation regex failed');
```

### 5. Use Appropriate Severity

✅ **Good:**

```typescript
// Missing config is CRITICAL
throw new AppError(
	'DIRECTUS_ADMIN_TOKEN not configured',
	ErrorCategory.UNKNOWN,
	ErrorSeverity.CRITICAL
);
```

❌ **Bad:**

```typescript
// Missing config should not be LOW severity
throw new AppError('DIRECTUS_ADMIN_TOKEN not configured', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
```

## Migration Guide

### From Old Error Handling

**Before:**

```typescript
try {
	// operation
} catch (error) {
	console.error(error);
	return fail(500, { error: error.message });
}
```

**After:**

```typescript
try {
	// operation
} catch (error) {
	const response = handleError(error, { operation: 'name' });
	return fail(response.statusCode, response);
}
```

## Testing Errors

```typescript
import { describe, it, expect } from 'vitest';
import { createValidationError, handleError } from '#lib/server/utils/error-handler';

describe('Error Handling', () => {
	it('creates validation error with correct properties', () => {
		const error = createValidationError('Email required', { field: 'email' });

		expect(error.category).toBe('validation');
		expect(error.statusCode).toBe(400);
		expect(error.userMessage).toContain('invalid');
	});

	it('handles errors consistently', () => {
		const error = new Error('Something went wrong');
		const response = handleError(error, { operation: 'test' });

		expect(response.statusCode).toBe(500);
		expect(response.userMessage).toBeDefined();
		expect(response.category).toBe('unknown');
	});
});
```

## Error Response Examples

### Validation Error

```json
{
	"statusCode": 400,
	"error": "Email is required",
	"userMessage": "The provided data is invalid. Please check your input.",
	"category": "validation"
}
```

### Authentication Error

```json
{
	"statusCode": 401,
	"error": "Invalid credentials",
	"userMessage": "Authentication failed. Please try again.",
	"category": "authentication"
}
```

### Not Found Error

```json
{
	"statusCode": 404,
	"error": "User not found: abc123",
	"userMessage": "The requested user was not found.",
	"category": "not_found"
}
```

### External Service Error

```json
{
	"statusCode": 503,
	"error": "Directus error: Connection timeout",
	"userMessage": "Directus is temporarily unavailable. Please try again later.",
	"category": "external_service"
}
```

## See Also

- [Environment Validation](./environment.md)
- [Retry Logic](./retry-logic.md)
- [JSDoc Conventions](../conventions/jsdoc.md)
