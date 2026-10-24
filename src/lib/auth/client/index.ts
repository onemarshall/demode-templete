/**
 * Client-side Auth Exports
 *
 * Centralized client auth exports for clean imports.
 */

// Main auth client (canonical location: src/lib/auth-client.ts)
export { authClient } from "#lib/auth-client.js";

// Client helpers
export * from "./helpers";

// Client plugins
export { securityHeadersPlugin, csrfProtectionPlugin } from "./plugins/security";

// Client types
export * from "./types";
