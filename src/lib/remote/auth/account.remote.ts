import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { auth } from "#lib/auth/server/config.js";
import { getDB } from "#lib/auth/server/database/db.js";
import { logger, securityLogger } from "#lib/auth/shared/logger.js";
import { setAuthCookies } from "#lib/auth/server/utils.js";
import type { User as BetterAuthUser } from "better-auth";

// Type guard to check if the response is a success
type DeleteSuccess = {
  success: true;
  user: BetterAuthUser;
};

const isDeleteSuccess = (res: unknown): res is DeleteSuccess => {
  return typeof res === "object" && res !== null && "success" in res && res.success === true;
};

const deleteAccountSchema = z.object({
  password: z.string().optional(),
  token: z.string().optional(),
  callbackURL: z.string().optional(),
});

/**
 * Handles account deletion requests
 * Uses Better Auth's built-in password verification and email verification
 */
export const deleteAccount = command(
  deleteAccountSchema,
  async ({ password, token, callbackURL }) => {
    const { request, cookies } = getRequestEvent();
    try {
      // Call Better Auth's deleteUser API
      const result = await auth.api.deleteUser({
        headers: request.headers,
        body: {
          password,
          token,
          callbackURL: callbackURL || "/auth/goodbye",
        },
        asResponse: true,
      });

      setAuthCookies(cookies, result.headers);

      const body = (await result.json().catch(() => ({}))) as unknown;

      // If deletion was successful
      if (result.ok && isDeleteSuccess(body)) {
        logger.info("User deleted", {
          userId: body.user.id,
          ip: request.headers.get("x-forwarded-for"),
        });

        // Remote commands cannot redirect — the client navigates instead
        return { success: true, redirect: callbackURL || "/auth/goodbye" };
      }

      // If we get here, deletion failed
      const errorMessage = (body as { message?: string }).message || "Failed to delete account";
      logger.warn("Account deletion failed", { reason: errorMessage });
      error(400, errorMessage);
    } catch (err) {
      if (err && typeof err === "object" && "status" in err) throw err;

      // Log unexpected errors
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      logger.error("Error in deleteAccount command", { error: errorMessage });
      error(500, errorMessage);
    }
  },
);

const unlinkWalletSchema = z.object({
  walletAddress: z.string().min(1),
});

export const unlinkWallet = command(unlinkWalletSchema, async ({ walletAddress }) => {
  const { request } = getRequestEvent();
  try {
    // Get the session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      error(401, "Unauthorized");
    }

    logger.info("Unlinking wallet for user", {
      userId: session.user.id,
      walletAddress: walletAddress.substring(0, 6) + "...",
    });

    // Delete the wallet address from the database
    try {
      const pool = await getDB();
      const result = await pool.query(
        'DELETE FROM "walletAddress" WHERE "userId" = $1 AND address = $2',
        [session.user.id, walletAddress],
      );

      if (result.rowCount === 0) {
        error(404, "Wallet address not found");
      }

      securityLogger.info("Wallet unlinked successfully", {
        userId: session.user.id,
        walletAddress: walletAddress.substring(0, 6) + "...",
      });

      return { success: true };
    } catch (dbError) {
      if (dbError && typeof dbError === "object" && "status" in dbError) throw dbError;
      logger.error("Database error while unlinking wallet", { error: dbError });
      error(500, "Failed to unlink wallet");
    }
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    logger.error("Error unlinking wallet", { error: err });
    securityLogger.error("Failed to unlink wallet", { error: err });
    error(500, "Internal server error");
  }
});
