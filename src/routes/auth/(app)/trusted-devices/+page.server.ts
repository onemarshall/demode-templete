// src/routes/auth/(app)/trusted-devices/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import { auth } from "#lib/auth.js";
import { logger } from "#lib/auth/shared/logger.js";
import type { Actions, PageServerLoad } from "./$types";

// Resolve names and attributes from the configured prefix, secure-cookie and domain settings.
async function getTrustCookie() {
  return (await auth.$context).createAuthCookie("trust_device");
}

/**
 * Parse user agent for device info
 */
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();

  let osName = "Unknown";
  let browserName = "Unknown";

  // Detect OS
  if (ua.includes("iphone") || ua.includes("ipad")) osName = "iOS";
  else if (ua.includes("android")) osName = "Android";
  else if (ua.includes("windows")) osName = "Windows";
  else if (ua.includes("mac")) osName = "macOS";
  else if (ua.includes("linux")) osName = "Linux";

  // Detect Browser
  if (ua.includes("edg/")) browserName = "Edge";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browserName = "Chrome";
  else if (ua.includes("firefox")) browserName = "Firefox";
  else if (ua.includes("safari")) browserName = "Safari";

  return { osName, browserName };
}

/**
 * Check if trusted device cookie exists
 */
function hasTrustedDeviceCookie(cookieHeader: string | null, name: string): boolean {
  return !!cookieHeader?.split(";").some((cookie) => cookie.trim().startsWith(`${name}=`));
}

export const load: PageServerLoad = async ({ request, getClientAddress, depends }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw redirect(302, "/auth/sign-in");
    }

    depends("auth:trustedDevices");

    const userAgent = request.headers.get("user-agent") || "";
    const cookieHeader = request.headers.get("cookie");
    const { osName, browserName } = parseUserAgent(userAgent);

    // Check if current device is trusted (cookie exists)
    const trustCookie = await getTrustCookie();
    const isCurrentDeviceTrusted = hasTrustedDeviceCookie(cookieHeader, trustCookie.name);

    // Check if user has 2FA enabled
    const twoFactorEnabled =
      "twoFactorEnabled" in session.user ? Boolean(session.user.twoFactorEnabled) : false;

    return {
      currentDevice: {
        ip: getClientAddress(),
        userAgent: userAgent.slice(0, 100),
        osName,
        browserName,
      },
      isCurrentDeviceTrusted,
      twoFactorEnabled,
    };
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }
    logger.error("Trusted devices page load error", { error });
    throw redirect(302, "/auth/sign-in");
  }
};

export const actions: Actions = {
  /**
   * Revoke trust for the current device
   * This deletes the trust cookie so 2FA will be required on next sign-in
   */
  revokeCurrentDevice: async ({ request, cookies }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session?.user) {
        return fail(401, { error: "Unauthorized" });
      }

      // Delete the trusted device cookie
      const trustCookie = await getTrustCookie();
      cookies.delete(trustCookie.name, {
        path: trustCookie.attributes.path ?? "/",
        domain: trustCookie.attributes.domain,
        secure: trustCookie.attributes.secure,
        httpOnly: trustCookie.attributes.httpOnly,
        partitioned: trustCookie.attributes.partitioned,
      });

      logger.info("Device trust revoked", { userId: session.user.id });

      return {
        success: true,
        message:
          "Trust cookie removed from this browser. Your next sign-in follows the configured two-factor policy.",
      };
    } catch (error) {
      logger.error("Failed to revoke device trust", { error });
      return fail(500, { error: "Failed to revoke device trust" });
    }
  },

  /** Remove trust here and sign out other sessions. This does not clear other browsers' trust cookies. */
  revokeAllDevices: async ({ request, cookies }) => {
    let currentDeviceTrustRemoved = false;
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) return fail(401, { error: "Unauthorized" });

      const trustCookie = await getTrustCookie();
      cookies.delete(trustCookie.name, {
        path: trustCookie.attributes.path ?? "/",
        domain: trustCookie.attributes.domain,
        secure: trustCookie.attributes.secure,
        httpOnly: trustCookie.attributes.httpOnly,
        partitioned: trustCookie.attributes.partitioned,
      });
      currentDeviceTrustRemoved = true;
      const result = await auth.api.revokeOtherSessions({ headers: request.headers });
      if (result.status !== true) throw new Error("Other sessions were not revoked");

      logger.info("Browser trust cookie removed and other sessions signed out", {
        userId: session.user.id,
      });
      return {
        success: true,
        message:
          "Trust removed from this browser and other sessions signed out. Trust cookies on other browsers are unchanged.",
      };
    } catch (error) {
      logger.error("Failed to remove browser trust and sign out other sessions", { error });
      return fail(500, {
        partial: currentDeviceTrustRemoved,
        error: currentDeviceTrustRemoved
          ? "Trust was removed from this browser, but other sessions could not be signed out. Try signing out other sessions again."
          : "Could not remove browser trust or sign out other sessions. Please try again.",
      });
    }
  },
};
