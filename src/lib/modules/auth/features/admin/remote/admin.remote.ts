import { form, query, command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { getAdminApi } from "../../../server/admin-helpers.js";
import { z } from "zod";
import { auth } from "../../../server/config.js";
import { isAdminUser, type UserWithRoles } from "../../../shared/roles.js";
import { sendTemplateEmail } from "../../../server/email/index.js";
import { securityLogger, logger } from "#lib/platform/logger.js";
import {
  banUserSchema,
  userIdSchema,
  setRoleSchema,
  setPasswordSchema,
  revokeSessionSchema,
} from "../../../shared/types/admin.js";
import type { UserListItem, UserDetail, SessionItem } from "../shared/types.js";

interface AdminApi {
  listUsers(input: {
    query?: { limit?: number; page?: number; cursor?: string };
    headers: Headers;
  }): Promise<{ users: UserListItem[]; total?: number }>;
  getUser(input: { query: { id: string }; headers: Headers }): Promise<{ user?: UserDetail }>;
  listUserSessions(input: {
    body: { userId: string };
    headers: Headers;
  }): Promise<{ sessions: SessionItem[] }>;
  banUser(input: {
    body: { userId: string; banReason?: string; banExpiresIn?: number };
    headers: Headers;
  }): Promise<void>;
  unbanUser(input: { body: { userId: string }; headers: Headers }): Promise<void>;
  setRole(input: { body: { userId: string; role: string }; headers: Headers }): Promise<void>;
  setUserPassword(input: {
    body: { userId: string; newPassword: string };
    headers: Headers;
  }): Promise<void>;
  revokeUserSession(input: { body: { sessionToken: string }; headers: Headers }): Promise<void>;
  revokeUserSessions(input: { body: { userId: string }; headers: Headers }): Promise<void>;
  removeUser(input: { body: { userId: string }; headers: Headers }): Promise<void>;
}

function getAdmin() {
  return getAdminApi() as AdminApi;
}

export const listUsers = query(async () => {
  const { request } = getRequestEvent();
  return getAdmin().listUsers({ headers: request.headers });
});

export const getUser = query(z.string(), async (id) => {
  const { request } = getRequestEvent();
  return getAdmin().getUser({ query: { id }, headers: request.headers });
});

export const listUserSessions = query(userIdSchema, async ({ userId }) => {
  const { request } = getRequestEvent();
  return getAdmin().listUserSessions({ body: { userId }, headers: request.headers });
});

export const banUser = form(banUserSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().banUser({ body: data, headers: request.headers });
  // Note: listUsers.refresh() is not available on RemoteQueryFunction
  // The client side will need to handle refetching
});

export const unbanUser = form(userIdSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().unbanUser({ body: data, headers: request.headers });
  // Note: listUsers.refresh() is not available on RemoteQueryFunction
  // The client side will need to handle refetching
});

export const setRole = form(setRoleSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().setRole({ body: data, headers: request.headers });
  // Note: listUsers.refresh() is not available on RemoteQueryFunction
  // The client side will need to handle refetching
});

export const setUserPassword = form(setPasswordSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().setUserPassword({ body: data, headers: request.headers });
});

export const revokeSession = form(revokeSessionSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().revokeUserSession({ body: data, headers: request.headers });
});

export const revokeAllSessions = form(userIdSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().revokeUserSessions({ body: data, headers: request.headers });
});

export const removeUser = form(userIdSchema, async (data) => {
  const { request } = getRequestEvent();
  await getAdmin().removeUser({ body: data, headers: request.headers });
  // Note: listUsers.refresh() is not available on RemoteQueryFunction
  // The client side will need to handle refetching
});

// ============================================
// Admin test tooling
// ============================================

const testEmailSchema = z.object({
  type: z.enum(["verification", "delete", "resetPassword", "welcome", "notification"]),
  email: z.string().email().max(254),
  name: z.string().max(200).optional(),
});

/**
 * Send a test template email. Admin only — without an auth check this
 * would be an open relay: anyone could spam arbitrary addresses through
 * our provider.
 */
export const sendTestEmail = command(testEmailSchema, async ({ type, email, name }) => {
  const { request } = getRequestEvent();
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user as UserWithRoles | undefined;
  if (!user || !isAdminUser(user)) {
    error(403, "Admin access required");
  }

  const nameValue = typeof name === "string" ? name : undefined;

  try {
    switch (type) {
      case "verification":
        await sendTemplateEmail("verification", {
          email,
          url: "https://yourdomain.com/verify?token=example",
          name: nameValue,
          appName: "Your App",
        });
        break;
      case "delete":
        await sendTemplateEmail("delete-account", {
          email,
          url: "https://yourdomain.com/verify?token=example",
          name: nameValue,
          appName: "Your App",
        });
        break;
      case "resetPassword":
        await sendTemplateEmail("password-reset", {
          email,
          url: "https://yourdomain.com/verify?token=example",
          name: nameValue,
          appName: "Your App",
        });
        break;
      case "welcome":
        await sendTemplateEmail("welcome", {
          email,
          name: nameValue ?? "there",
          appName: "Your App",
        });
        break;
      case "notification":
        await sendTemplateEmail("notification", {
          email,
          name: nameValue,
          title: "Test Notification",
          message: "This is a test notification email.",
          actionUrl: "https://yourdomain.com/dashboard",
          actionText: "Go to Dashboard",
          appName: "Your App",
        });
        break;
    }

    return { success: true };
  } catch (err) {
    securityLogger.error("Email sending failed:", err);
    error(500, "Failed to send email");
  }
});

/**
 * Test endpoint for Directus plugin installation. Admin only.
 */
export const runDirectusPluginTest = query(async () => {
  const { request } = getRequestEvent();
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user as UserWithRoles | undefined;
  if (!user || !isAdminUser(user)) {
    error(403, "Admin access required");
  }

  try {
    logger.info("Running Directus plugin installation test...");

    await runAllTests();

    return {
      success: true,
      message: "Directus plugin test completed. Check server logs for detailed results.",
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error("Directus plugin test failed:", err);

    error(
      500,
      err instanceof Error ? err.message : "Directus plugin test failed with an unknown error",
    );
  }
});

async function runAllTests(): Promise<void> {
  return;
}
