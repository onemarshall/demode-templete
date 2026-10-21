/**
 * Server-side Auth Exports
 *
 * Centralized server auth exports for clean imports.
 */

// Main auth instance and types
export { auth } from './config';
export type { Auth, User, Session } from './types';

// Plugin exports
export * from './plugins';

// Options exports
export * from './options';

// Auth helpers exports
export * from './auth-helpers';

// CMS exports
// Avoid duplicate getCMSProvider export (already exported via ./plugins)
export { createCMSProvider, initializeCMS, resetCMS } from './cms';
export type { CMSProvider, CMSConfig, CMSProviderType, CMSUser, CMSFile } from './cms';

// Storage exports
export * from './storage';
