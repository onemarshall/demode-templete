# JSDoc Documentation Guide

This guide explains the JSDoc commenting standards used throughout this project.

## Overview

JSDoc comments provide inline documentation that:

- ✅ Improves IDE autocomplete and type hints
- ✅ Generates API documentation
- ✅ Helps developers understand code quickly
- ✅ Serves as living documentation

## Basic Format

```typescript
/**
 * Brief description of what the function does
 *
 * Longer description explaining the purpose, behavior, and any important details
 * about how the function works.
 *
 * @param paramName - Description of the parameter
 * @param paramName.property - Description of nested property
 * @returns Description of what the function returns
 * @throws {ErrorType} Description of when this error is thrown
 * @example
 * // Example usage
 * const result = myFunction(param1, param2);
 */
function myFunction(param1: string, param2: number): string {
	// implementation
}
```

## Tags Reference

### @param

Describes function parameters:

```typescript
/**
 * @param name - The user's full name
 * @param age - The user's age in years
 * @param options - Configuration object
 * @param options.email - User's email address
 * @param options.verified - Whether email is verified
 */
function createUser(name: string, age: number, options: { email: string; verified: boolean }) {}
```

### @returns (or @return)

Describes the return value:

```typescript
/**
 * @returns The created user object with ID
 * @returns null if creation failed
 */
function createUser(data: UserData): User | null {}
```

### @throws

Documents exceptions that can be thrown:

```typescript
/**
 * @throws {ValidationError} If input data is invalid
 * @throws {DatabaseError} If database connection fails
 */
async function saveUser(user: User): Promise<void> {}
```

### @example

Provides usage examples:

```typescript
/**
 * @example
 * const user = await findUser({ email: 'user@example.com' });
 * if (user) {
 *   console.log('Found:', user.name);
 * }
 *
 * @example
 * // Multiple examples are supported
 * const users = await findUser({ role: 'admin' });
 */
async function findUser(criteria: SearchCriteria): Promise<User | null> {}
```

### @deprecated

Marks code as deprecated:

```typescript
/**
 * @deprecated Use `newFunction()` instead. This will be removed in v2.0.
 */
function oldFunction() {}
```

### @private

Marks methods as private (for documentation purposes):

```typescript
/**
 * Internal helper function
 * @private
 */
function internalHelper() {}
```

### @async

Documents async functions:

```typescript
/**
 * Fetches user data from the server
 * @async
 * @param userId - The user ID to fetch
 * @returns Promise resolving to the user object
 */
async function getUser(userId: string): Promise<User> {}
```

### @class

Documents classes:

```typescript
/**
 * DirectusUserService
 *
 * Manages synchronization between Better Auth users and Directus CMS
 * Handles user creation, updates, and avatar synchronization
 *
 * @class DirectusUserService
 * @throws {Error} If DIRECTUS_ADMIN_TOKEN is not configured
 */
export class DirectusUserService {
	// implementation
}
```

## Examples from Codebase

### DirectusUserService

```typescript
/**
 * DirectusUserService
 *
 * Manages synchronization between Better Auth users and Directus CMS
 * Handles user creation, updates, and avatar synchronization
 *
 * @class DirectusUserService
 * @throws {Error} If DIRECTUS_ADMIN_TOKEN is not configured
 *
 * @example
 * const service = new DirectusUserService();
 * const user = await service.findUser({ email: 'user@example.com' });
 * await service.createUser(betterAuthUser);
 * await service.updateUser(betterAuthUser);
 */
export class DirectusUserService {
	/**
	 * Initializes the DirectusUserService with admin token
	 *
	 * @throws {Error} If DIRECTUS_ADMIN_TOKEN environment variable is not set
	 */
	constructor() {}

	/**
	 * Finds a user in Directus by email or external identifier
	 *
	 * @param identifier - Object containing email and/or id to search by
	 * @param identifier.id - Better Auth user ID (external_identifier in Directus)
	 * @param identifier.email - User email address (case-insensitive)
	 * @returns The Directus user if found, null otherwise
	 *
	 * @example
	 * const user = await service.findUser({ email: 'user@example.com' });
	 * const user = await service.findUser({ id: 'better-auth-user-id' });
	 */
	async findUser(identifier: { id?: string; email?: string }): Promise<DirectusUser | null> {}

	/**
	 * Syncs a Better Auth user to Directus
	 * Creates a new user if not found, otherwise updates existing user
	 *
	 * @param user - Better Auth user object to sync
	 * @returns The synced Directus user, or null if sync failed
	 *
	 * @example
	 * const directusUser = await service.syncUser(betterAuthUser);
	 * if (directusUser) {
	 *   console.log('User synced:', directusUser.id);
	 * }
	 */
	async syncUser(user: BetterAuthUser): Promise<DirectusUser | null> {}
}
```

### Avatar Utility

```typescript
/**
 * Resizes a Directus asset URL to a specific dimension
 * For Directus URLs, adds image transformation parameters
 * For external URLs (GitHub, Google), returns as-is
 *
 * @param url - The avatar URL to resize
 * @param size - The desired size in pixels (default: 300)
 * @returns The resized URL or original URL if not a Directus asset
 *
 * @example
 * // Directus URL
 * getResizedAvatarUrl('http://localhost:8051/assets/abc123', 300)
 * // Returns: 'http://localhost:8051/assets/abc123?width=300&height=300&fit=cover'
 *
 * // External URL (GitHub)
 * getResizedAvatarUrl('https://avatars.githubusercontent.com/u/123', 300)
 * // Returns: 'https://avatars.githubusercontent.com/u/123'
 */
export function getResizedAvatarUrl(
	url: string | null | undefined,
	size: number = 300
): string | null {}
```

## Best Practices

### 1. Write Clear Descriptions

✅ **Good:**

```typescript
/**
 * Validates email format using RFC 5322 standard
 * Returns true if valid, false otherwise
 */
```

❌ **Bad:**

```typescript
/**
 * Checks email
 */
```

### 2. Document Parameters Thoroughly

✅ **Good:**

```typescript
/**
 * @param user - The user object to validate
 * @param user.email - User's email address (must be unique)
 * @param user.age - User's age (must be >= 18)
 * @param options - Optional configuration
 * @param options.strict - Enable strict validation (default: true)
 */
```

❌ **Bad:**

```typescript
/**
 * @param user - User data
 * @param options - Options
 */
```

### 3. Include Examples

✅ **Good:**

```typescript
/**
 * @example
 * const result = await fetchUser('123');
 * console.log(result.name);
 */
```

❌ **Bad:**

```typescript
/**
 * Fetches a user
 */
```

### 4. Document Edge Cases

✅ **Good:**

```typescript
/**
 * Finds a user by email
 * Returns null if not found
 * Email search is case-insensitive
 *
 * @param email - Email to search for
 * @returns User object or null if not found
 */
```

❌ **Bad:**

```typescript
/**
 * Finds a user
 */
```

### 5. Use Correct Types

✅ **Good:**

```typescript
/**
 * @param count - Number of items to fetch
 * @returns Promise resolving to array of users
 * @throws {ValidationError} If count is negative
 */
```

❌ **Bad:**

```typescript
/**
 * @param count - The count
 * @returns Something
 */
```

## IDE Integration

### VS Code

JSDoc comments automatically provide:

- Hover documentation
- Parameter hints
- Return type information
- Autocomplete suggestions

### TypeScript

JSDoc works with TypeScript for:

- Type checking
- IDE autocomplete
- Documentation generation
- Type inference

## Generating Documentation

### TypeDoc

Generate HTML documentation from JSDoc:

```bash
npx typedoc --out docs src/lib/auth
```

### TSDoc

Use TSDoc format for better tooling support:

```typescript
/**
 * Fetches user data
 * @param userId - The user identifier
 * @returns The user object
 * @throws {@link UserNotFoundError} When user doesn't exist
 */
```

## Checklist

When adding new code, ensure:

- [ ] Function has JSDoc comment
- [ ] All parameters are documented
- [ ] Return type is documented
- [ ] Exceptions are documented
- [ ] At least one example is provided
- [ ] Complex logic is explained
- [ ] Edge cases are noted
- [ ] Links to related functions are included

## Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [TSDoc Specification](https://tsdoc.org/)
- [Google JSDoc Style Guide](https://google.github.io/styleguide/tsguide.html#jsdoc-general-form)

## See Also

- [Environment Validation](../reference/environment.md)
- [Auth Module Layout](../architecture/auth-module.md)
