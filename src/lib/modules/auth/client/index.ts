/**
 * Client-side Auth Exports
 *
 * Centralized client auth exports for clean imports.
 */

// Browser auth client and its lifecycle
export { authClient, initializeAuth, cleanupAuth, getSecurityPlugin, isAuthInitialized } from "./client.js";

// Client helpers
export * from "./helpers";

// Client plugins
export { securityHeadersPlugin, csrfProtectionPlugin } from "./plugins/security";

// Client types
export * from "./types";
