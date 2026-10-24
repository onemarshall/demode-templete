/**
 * Transitional Phase 1 limits (decision D4, §11.2).
 *
 * Enforced server-side in provisioning and brand creation — never by UI
 * alone. Values are transitional; record any change before release.
 */

export const BRANDS_PER_ORGANISATION = 10;
export const MEMBERS_PER_BRAND = 25;
export const ORGANISATION_MEMBERS = 100;
export const ORGANISATIONS_PER_USER = 10;
export const PROVISIONING_MAX_ATTEMPTS = 5;
export const PROVISIONING_RETRY_BACKOFF_MS = 60_000;
