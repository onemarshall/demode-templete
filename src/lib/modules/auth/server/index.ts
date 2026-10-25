/**
 * Server-side Auth Exports
 *
 * Centralized server auth exports for clean imports.
 */

// Main auth instance and types
export { auth, initializeAuth } from './config';
export type { AuthIntegrations } from './integrations';
export type { Auth, User, Session } from './types';

// Plugin exports
export * from './plugins';

// Options exports
export * from './options';

// Auth helpers exports
export * from './auth-helpers';

// Email delivery belongs to auth; infrastructure is imported from platform directly.
export * from './email';
