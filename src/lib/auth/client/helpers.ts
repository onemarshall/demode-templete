/**
 * Auth Client Helpers
 *
 * Utilities for the Better Auth client including fetch wrappers,
 * session management, and security header injection.
 *
 * Moved to the proposed auth structure with updated imports.
 */

import { logger, securityLogger } from "#lib/auth/shared/logger.js";
import { publicEnv } from "#lib/auth/shared/env/index.js";
import type { SecurityHeaders } from "#lib/auth/security/types.js";
import { get, type Readable } from "svelte/store";
import type { User, Session } from "better-auth";

// ============================================
// Types
// ============================================

// Type-only import of the concrete client instance avoids a runtime cycle
// ($lib/auth-client imports helpers at runtime) while keeping the full
// plugin-inferred session/user types (e.g. twoFactorEnabled) in sync.
import type { authClient } from "#lib/auth-client.js";

type AuthClient = typeof authClient;

// Store value shape from useSession()
type SessionStoreValue = {
  data: { user: User; session: Session } | null;
  isPending: boolean;
  error: Error | null;
} | null;

interface GlobalFraudDetectionModule {
  getSecurityHeaders: () => SecurityHeaders;
  stopTracking?: () => void;
  resetTracking?: () => void;
  trackField?: (name: string, event: "focus" | "blur" | "input" | "paste") => void;
}

// Extend globalThis for type safety
declare global {
  var __fraudDetectionModule: GlobalFraudDetectionModule | undefined;
}

// ============================================
// Constants
// ============================================

const isDebugMode = publicEnv.PUBLIC_AUTH_DEBUG_MODE;
const SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// Module State
// ============================================

let sessionRefreshInterval: ReturnType<typeof setInterval> | null = null;
let sessionUnsubscribe: (() => void) | null = null;
let isSessionManagementInitialized = false;

function isSessionStore(store: unknown): store is Readable<SessionStoreValue> {
  return Boolean(store && typeof (store as Readable<SessionStoreValue>).subscribe === "function");
}

// ============================================
// Security Headers Integration
// ============================================

/**
 * Get security headers from fraud detection for use in fetch wrapper.
 * Requires fraud detection to be pre-initialized for synchronous access.
 */
function getSecurityHeadersSync(): Partial<SecurityHeaders> {
  try {
    const fraudDetectionModule = globalThis.__fraudDetectionModule;

    if (fraudDetectionModule?.getSecurityHeaders) {
      const headers = fraudDetectionModule.getSecurityHeaders();

      // Filter out any undefined/null values
      const cleanHeaders: Partial<SecurityHeaders> = {};

      for (const [key, value] of Object.entries(headers)) {
        if (value != null && value !== "") {
          if (
            key === "x-device-fingerprint" ||
            key === "x-behavior-data" ||
            key === "x-session-id"
          ) {
            cleanHeaders[key as keyof SecurityHeaders] = String(value);
          }
        }
      }

      return cleanHeaders;
    }
  } catch (error) {
    if (isDebugMode) {
      logger.debug("[Auth Client] Failed to get security headers", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {};
}

/**
 * Register the fraud detection module for synchronous access.
 * Call this after initializing fraud detection in +layout.svelte.
 */
export function registerFraudDetectionModule(module: GlobalFraudDetectionModule): void {
  if (typeof globalThis !== "undefined") {
    globalThis.__fraudDetectionModule = module;

    if (isDebugMode) {
      logger.debug("[Auth Client] Fraud detection module registered");
    }
  }
}

/**
 * Unregister the fraud detection module.
 * Call this on cleanup.
 */
export function unregisterFraudDetectionModule(): void {
  if (typeof globalThis !== "undefined") {
    globalThis.__fraudDetectionModule = undefined;
  }
}

export type { GlobalFraudDetectionModule };

// ============================================
// Fetch Wrapper
// ============================================

/**
 * Generate a unique request ID for logging
 */
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().substring(0, 8);
  }
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Creates a custom fetch wrapper that:
 * - Injects security headers from fraud detection
 * - Logs requests and responses in debug mode
 * - Redacts sensitive headers from logs
 * - Handles errors gracefully
 */
export function createFetchWrapper() {
  return async (url: URL | RequestInfo, options: RequestInit = {}): Promise<Response> => {
    const requestId = generateRequestId();
    const urlString = url instanceof URL ? url.toString() : String(url);

    // Always include credentials so Better Auth cookies are sent
    options.credentials = options.credentials ?? "include";

    // Only add security headers in browser environment
    if (typeof window !== "undefined") {
      try {
        const securityHeaders = getSecurityHeadersSync();

        if (Object.keys(securityHeaders).length > 0) {
          const headers = new Headers(options.headers);

          for (const [key, value] of Object.entries(securityHeaders)) {
            if (value) {
              headers.set(key, value);
            }
          }

          // Ensure Content-Type for POST/PUT/PATCH with body
          const method = (options.method || "GET").toUpperCase();
          if (["POST", "PUT", "PATCH"].includes(method) && options.body) {
            if (!headers.has("content-type")) {
              headers.set("content-type", "application/json");
            }
          }

          options.headers = headers;
        }
      } catch (error) {
        if (isDebugMode) {
          logger.warn(`[Auth Client ${requestId}] Failed to add security headers`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Debug logging - request
    if (isDebugMode) {
      const redactedHeaders = redactSensitiveHeaders(options.headers);
      logger.debug(`[Auth Client ${requestId}] Request`, {
        url: urlString,
        method: options.method || "GET",
        headers: redactedHeaders,
      });
    }

    // Make the request with error handling
    try {
      const response = await fetch(url, options);

      // Debug logging - response
      if (isDebugMode) {
        await logResponse(requestId, urlString, response);
      }

      return response;
    } catch (error) {
      if (isDebugMode) {
        logger.error(`[Auth Client ${requestId}] Fetch failed`, {
          url: urlString,
          method: options.method || "GET",
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  };
}

/**
 * Redact sensitive headers for logging
 */
function redactSensitiveHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const redacted: Record<string, string> = {};
  const sensitiveKeys = ["authorization", "cookie", "x-device-fingerprint", "set-cookie"];

  if (!headers) return redacted;

  const headersObj = new Headers(headers);
  headersObj.forEach((value, key) => {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.includes(keyLower)) {
      redacted[key] = "[REDACTED]";
    } else if (keyLower === "x-behavior-data") {
      // Show truncated behavior data
      redacted[key] = value.length > 50 ? `${value.substring(0, 50)}...` : value;
    } else {
      redacted[key] = value;
    }
  });

  return redacted;
}

/**
 * Log response details (avoiding passkey endpoint body reads)
 */
async function logResponse(requestId: string, url: string, response: Response): Promise<void> {
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    // Redact sensitive response headers too
    if (key.toLowerCase() === "set-cookie") {
      responseHeaders[key] = "[REDACTED]";
    } else {
      responseHeaders[key] = value;
    }
  });

  const baseLog = {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  };

  // Don't read body for passkey endpoints (interferes with WebAuthn)
  if (url.includes("/passkey/")) {
    logger.debug(`[Auth Client ${requestId}] Response (passkey)`, baseLog);
    return;
  }

  // Try to log response body
  try {
    const clonedResponse = response.clone();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await clonedResponse.json();
      logger.debug(`[Auth Client ${requestId}] Response`, { ...baseLog, body });
    } else {
      const text = await clonedResponse.text();
      const truncatedText = text.length > 200 ? `${text.substring(0, 200)}...` : text;
      logger.debug(`[Auth Client ${requestId}] Response`, { ...baseLog, body: truncatedText });
    }
  } catch {
    logger.debug(`[Auth Client ${requestId}] Response`, baseLog);
  }
}

// ============================================
// Session Management
// ============================================

/**
 * Initialize session management features.
 * - Auto-refresh session periodically
 * - Log auth state changes in debug mode
 *
 * Call this once from your root layout's onMount.
 */
export function initializeSessionManagement(authClient: AuthClient): void {
  // Prevent double initialization
  if (isSessionManagementInitialized) {
    if (isDebugMode) {
      logger.debug("[Auth Client] Session management already initialized");
    }
    return;
  }

  // Only run in browser
  if (typeof window === "undefined") {
    return;
  }

  isSessionManagementInitialized = true;

  // Auto-refresh session periodically
  sessionRefreshInterval = setInterval(
    () => refreshSession(authClient),
    SESSION_REFRESH_INTERVAL_MS,
  );

  // Log auth state changes in debug mode
  if (isDebugMode) {
    try {
      const sessionStore = authClient.useSession();

      if (isSessionStore(sessionStore)) {
        sessionUnsubscribe = sessionStore.subscribe((session) => {
          logger.debug("[Auth Client] Auth state changed", {
            isAuthenticated: !!session?.data?.user,
            userId: session?.data?.user?.id,
            email: session?.data?.user?.email
              ? `${session.data.user.email.substring(0, 3)}...`
              : undefined,
            isPending: session?.isPending,
            hasError: !!session?.error,
          });
        });
      }
    } catch (error) {
      logger.warn("[Auth Client] Failed to subscribe to session", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.debug("[Auth Client] Session management initialized");
  }
}

/**
 * Clean up session management.
 * Call this on app unmount.
 */
export function cleanupSessionManagement(): void {
  if (sessionRefreshInterval) {
    clearInterval(sessionRefreshInterval);
    sessionRefreshInterval = null;
  }

  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }

  isSessionManagementInitialized = false;

  if (isDebugMode) {
    logger.debug("[Auth Client] Session management cleaned up");
  }
}

/**
 * Refresh the session by fetching fresh session data from the server.
 * This forces Better Auth to re-validate the session cookie.
 */
export async function refreshSession(authClient: AuthClient): Promise<boolean> {
  try {
    if (isDebugMode) {
      logger.debug("[Auth Client] Refreshing session...");
    }

    // Use getSession to refresh - this fetches fresh data from the server
    // Note: getSession returns a discriminated union { data, error }
    const response = await authClient.getSession({
      fetchOptions: {
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
      },
    });

    if ("error" in response && response.error) {
      if (isDebugMode) {
        logger.debug("[Auth Client] Session refresh returned error", response.error);
      }
      return false;
    }

    const result = response?.data ?? null;
    const hasUser = !!result?.user;

    if (isDebugMode) {
      logger.debug("[Auth Client] Session refresh complete", {
        hasUser,
        userId: result?.user?.id,
      });
    }

    return hasUser;
  } catch (error) {
    // Session refresh failures are often expected (e.g., not logged in)
    if (isDebugMode) {
      logger.debug("[Auth Client] Session refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return false;
  }
}

/**
 * Check if user is currently authenticated.
 * Uses cached session data, doesn't make a network request.
 */
export function isAuthenticated(authClient: AuthClient): boolean {
  try {
    const sessionStore = authClient.useSession();

    if (isSessionStore(sessionStore)) {
      const currentSession = get(sessionStore);
      return !!currentSession?.data?.user;
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================
// Request Body Parsing
// ============================================

/**
 * Safely parse request body to JSON
 */
export async function safeParseBody<T = unknown>(request: Request): Promise<T | null> {
  try {
    const clonedRequest = request.clone();
    return (await clonedRequest.json()) as T;
  } catch (error) {
    securityLogger.warn("Failed to parse request body", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Safely parse form data from request
 */
export async function safeParseFormData(request: Request): Promise<FormData | null> {
  try {
    const clonedRequest = request.clone();
    return await clonedRequest.formData();
  } catch (error) {
    securityLogger.warn("Failed to parse form data", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
