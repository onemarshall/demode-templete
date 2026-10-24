import { command, getRequestEvent } from "$app/server";
import { auth } from "#lib/auth/server/config.js";
import { getCMSProvider } from "#lib/auth/server/cms/index.js";
import type { DirectusCMSProviderType } from "#lib/auth/server/cms/providers/directus/index.js";
import { logger } from "#lib/auth/shared/logger.js";
import { error } from "@sveltejs/kit";
import { z } from "zod";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export const uploadAvatar = command(z.instanceof(File), async (file) => {
  const { request } = getRequestEvent();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    error(401, "Not authenticated");
  }

  const cms = getCMSProvider() as DirectusCMSProviderType | null;
  if (!cms?.userSyncService) {
    logger.error("CMS provider not available for avatar upload");
    error(500, "Avatar uploads not available — CMS provider not initialized");
  }

  if (file.size === 0) {
    error(400, "No avatar file provided");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    error(400, "Avatar must be 5MB or smaller");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    error(400, "Avatar must be a JPEG, PNG, WebP, GIF, or AVIF image");
  }

  // Find Directus user
  const directusUser = await cms.userSyncService.findUser({
    email: session.user.email,
    id: session.user.id,
  });

  if (!directusUser) {
    logger.error("Directus user not found for avatar upload", {
      userId: session.user.id,
      email: session.user.email,
    });
    error(500, "Directus user not found");
  }

  // Upload avatar to Directus and set on user
  const uploadedAvatarId = await cms.userSyncService.uploadAvatar(directusUser.id, file);

  if (!uploadedAvatarId) {
    error(500, "Failed to upload avatar to Directus");
  }

  const imageUrl = cms.getAssetUrl(uploadedAvatarId);

  // Update Better Auth user
  await auth.api.updateUser({
    headers: request.headers,
    body: { image: imageUrl },
  });

  logger.info("Avatar uploaded successfully", {
    userId: session.user.id,
    directusUserId: directusUser.id,
    fileId: uploadedAvatarId,
    imageUrl,
  });

  return { image: imageUrl };
});

export const deleteAvatar = command(async () => {
  const { request } = getRequestEvent();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    error(401, "Not authenticated");
  }

  const cms = getCMSProvider() as DirectusCMSProviderType | null;

  if (cms?.userSyncService) {
    try {
      const directusUser = await cms.userSyncService.findUser({
        email: session.user.email,
        id: session.user.id,
      });
      if (directusUser) {
        await cms.deleteUserAvatar(directusUser.id);
      }
    } catch (err) {
      logger.warn("Failed to delete Directus avatar", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await auth.api.updateUser({
    headers: request.headers,
    body: { image: null },
  });

  return { success: true };
});
