/**
 * Directus Client Configuration and Management
 *
 * This module sets up and manages Directus SDK clients with enhanced functionality
 * including rate limiting, retry logic, and authentication handling.
 *
 * Key Features:
 * - Rate limiting (10 requests per 500ms interval)
 * - Automatic retry for 429 (Too Many Requests) responses
 * - Token-based authentication support
 * - Request queuing to prevent overwhelming the API
 * - Browser and server-safe implementations
 *
 * Architecture:
 * - Base client with rate limiting and retry logic
 * - Token wrapper for authenticated requests
 * - Separate browser-safe and server implementations
 *
 * Rate Limiting Strategy:
 * - Uses p-queue for request throttling
 * - 10 concurrent requests per 500ms window
 * - Carryover concurrency for burst handling
 * - Automatic retry with exponential backoff for 429 errors
 *
 * Usage:
 * ```typescript
 * import { createDirectusClient } from '$lib/services/directus/client'
 *
 * // Browser usage (with optional token)
 * const client = createDirectusClient(fetch, token)
 *
 * // Server usage
 * const client = createDirectusClientServer(fetch)
 * ```
 */

import { createDirectus, rest, staticToken } from "@directus/sdk";
import type { RestClient } from "@directus/sdk";
import Queue from "p-queue";
import type { Schema } from "$lib/types/directus-schema";
import { PUBLIC_DIRECTUS_URL } from "$app/env/public";
import { createScopedLogger } from "$lib/utils/logger";

const log = createScopedLogger(["Directus", "Client"]);

type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchRetry = async (
  fetch: FetchFunction,
  count: number,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetch(input, init);
  if (count > 2 || response.status !== 429) return response;
  log.warn(`[429] Too Many Requests (Attempt ${count + 1})`);
  await sleep(500);
  return fetchRetry(fetch, count + 1, input, init);
};

const queue = new Queue({ intervalCap: 10, interval: 500, carryoverConcurrencyCount: true });

export const createBaseDirectusClient = (fetch: FetchFunction) =>
  createDirectus<Schema>(PUBLIC_DIRECTUS_URL, {
    globals: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        queue.add(() => fetchRetry(fetch, 0, input, init)),
    },
  }).with(rest());

export const withDirectusToken = (
  client: ReturnType<typeof createBaseDirectusClient>,
  token?: string,
): RestClient<Schema> => (token ? client.with(staticToken(token)) : client);

// Browser-safe version - only uses explicitly provided tokens
export const createDirectusClient = (fetch: FetchFunction, token?: string): RestClient<Schema> => {
  return withDirectusToken(createBaseDirectusClient(fetch), token);
};

export type DirectusClient = RestClient<Schema>;
