/**
 * Client Security Plugins
 *
 * Security-related client plugins for Better Auth.
 */

import { logger } from "#lib/platform/logger.js";

// Note: Better Auth client plugins are not strongly typed yet
// Using a generic plugin interface for now
interface ClientPlugin {
  id: string;
  init?: (ctx: ClientPluginContext) => void;
}

interface ClientPluginContext {
  hooks: {
    beforeRequest?: Array<(request: Request) => Promise<Request>>;
  };
}

/**
 * Security headers plugin for client-side requests
 */
export function securityHeadersPlugin(
  options: {
    enabled?: boolean;
    debug?: boolean;
  } = {},
): ClientPlugin {
  const { enabled = true, debug = false } = options;

  return {
    id: "security-headers",
    init: (ctx: ClientPluginContext) => {
      if (!enabled) return;

      // Add security headers to all client requests
      ctx.hooks.beforeRequest?.push(async (request: Request) => {
        if (debug) {
          logger.debug("[Security Plugin] Adding headers to request");
        }

        // Add security headers
        request.headers.set("x-requested-with", "XMLHttpRequest");
        request.headers.set("x-content-type-options", "nosniff");

        return request;
      });
    },
  };
}

/**
 * CSRF protection plugin
 */
export function csrfProtectionPlugin(
  options: {
    enabled?: boolean;
    tokenHeader?: string;
  } = {},
): ClientPlugin {
  const { enabled = true, tokenHeader = "x-csrf-token" } = options;

  return {
    id: "csrf-protection",
    init: (ctx: ClientPluginContext) => {
      if (!enabled) return;

      // Add CSRF token to requests
      ctx.hooks.beforeRequest?.push(async (request: Request) => {
        // Only add to state-changing requests
        if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
          const token = getCsrfToken();
          if (token) {
            request.headers.set(tokenHeader, token);
          }
        }

        return request;
      });
    },
  };
}

/**
 * Get CSRF token from cookie or meta tag
 */
function getCsrfToken(): string | null {
  // Try cookie first
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf-token" && value) {
      return decodeURIComponent(value);
    }
  }

  // Try meta tag
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  return meta?.content || null;
}
