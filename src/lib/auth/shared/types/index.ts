/**
 * Shared Type Exports
 *
 * Centralized type exports for the auth system.
 * This replaces your scattered type definitions.
 */

// Core auth types (from Better Auth inference)
export type { User, Session } from '$lib/auth/server';

// Form data types
export * from './forms';

// API response types
export * from './api';

// UI state types
export * from './ui';

// Utility types
export * from './utils';

// Directus schema types
export * from './directus-schema';
