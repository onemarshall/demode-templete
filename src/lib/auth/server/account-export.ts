import { auth } from "#lib/auth/index.js";
import { getDB } from "#lib/auth/server/database/db.js";
import { getPublicEnv } from "#lib/auth/shared/env/index.js";

const MAX_EXPORT_SESSIONS = 100;
const MAX_EXPORT_ACCOUNTS = 50;
const MAX_EXPORT_SUBSCRIPTIONS = 100;
const FRESH_AUTH_MS = 60 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function dateValue(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function pick(source: UnknownRecord, keys: string[]): UnknownRecord {
  return Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => {
        const value = source[key];
        return [key, typeof value === "string" ? value.slice(0, 2048) : value];
      }),
  );
}

/** Returns a bounded, explicitly allowlisted export for the signed-in user. */
export async function createAccountExport(
  headers: Headers,
  now = Date.now(),
): Promise<UnknownRecord> {
  const current = await auth.api.getSession({ headers });
  if (!current?.user || !current.session) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }
  const sessionCreated = new Date(current.session.createdAt).getTime();
  if (
    !Number.isFinite(sessionCreated) ||
    now - sessionCreated > FRESH_AUTH_MS ||
    sessionCreated > now + 60_000
  ) {
    throw Object.assign(new Error("Please sign in again before downloading your data."), {
      status: 403,
    });
  }

  const userId = current.user.id;
  const [accounts, sessions, pool] = await Promise.all([
    auth.api.listUserAccounts({ headers }),
    auth.api.listSessions({ headers }),
    getDB(),
  ]);

  let subscriptionRows: UnknownRecord[] = [];
  let subscriptionsTruncated = false;
  try {
    const subscriptionResult = await pool.query(
      `SELECT "productId", status, "periodStart", "periodEnd", "cancelAtPeriodEnd"
			 FROM creem_subscription
			 WHERE "referenceId" = $1
			 ORDER BY "periodStart" DESC NULLS LAST, id DESC
			 LIMIT $2`,
      [userId, MAX_EXPORT_SUBSCRIPTIONS + 1],
    );
    subscriptionsTruncated = subscriptionResult.rows.length > MAX_EXPORT_SUBSCRIPTIONS;
    subscriptionRows = subscriptionResult.rows.slice(0, MAX_EXPORT_SUBSCRIPTIONS);
  } catch (error) {
    const publicEnv = await getPublicEnv();
    // A missing table is expected only when billing is disabled for this installation.
    if (
      publicEnv.PUBLIC_CREEM_ENABLED ||
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "42P01"
    )
      throw error;
  }

  const user = record(current.user);
  const userFields = pick(user, [
    "id",
    "name",
    "email",
    "emailVerified",
    "image",
    "createdAt",
    "updatedAt",
    "role",
    "username",
    "displayUsername",
    "twoFactorEnabled",
  ]);
  for (const field of ["createdAt", "updatedAt"]) {
    if (field in userFields) userFields[field] = dateValue(userFields[field]);
  }

  return {
    format: "account-data-export",
    version: 1,
    generatedAt: new Date(now).toISOString(),
    scope:
      "Profile, provider, session and recent subscription data held by this authentication app. Activity history, data held by connected providers, and data in other external services are not included.",
    profile: userFields,
    limits: {
      linkedAccounts: {
        limit: MAX_EXPORT_ACCOUNTS,
        truncated: Array.isArray(accounts) && accounts.length > MAX_EXPORT_ACCOUNTS,
      },
      sessions: {
        limit: MAX_EXPORT_SESSIONS,
        truncated: Array.isArray(sessions) && sessions.length > MAX_EXPORT_SESSIONS,
      },
      subscriptions: { limit: MAX_EXPORT_SUBSCRIPTIONS, truncated: subscriptionsTruncated },
    },
    linkedAccounts: (Array.isArray(accounts) ? accounts : [])
      .slice(0, MAX_EXPORT_ACCOUNTS)
      .map((item) => {
        const account = record(item);
        return {
          ...pick(account, ["providerId", "accountId", "createdAt", "updatedAt"]),
          createdAt: dateValue(account.createdAt),
          updatedAt: dateValue(account.updatedAt),
        };
      }),
    sessions: (Array.isArray(sessions) ? sessions : [])
      .slice(0, MAX_EXPORT_SESSIONS)
      .map((item) => {
        const session = record(item);
        return {
          ...pick(session, ["id", "createdAt", "updatedAt", "expiresAt", "ipAddress", "userAgent"]),
          createdAt: dateValue(session.createdAt),
          updatedAt: dateValue(session.updatedAt),
          expiresAt: dateValue(session.expiresAt),
          isCurrent: session.id === current.session.id,
        };
      }),
    subscriptions: subscriptionRows.map((row: UnknownRecord) => ({
      ...pick(row, ["productId", "status", "cancelAtPeriodEnd"]),
      periodStart: dateValue(row.periodStart),
      periodEnd: dateValue(row.periodEnd),
    })),
  };
}
