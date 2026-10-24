/**
 * Avatar service - handles all avatar-related API operations
 * Calls the avatar remote functions instead of a REST endpoint
 */

import {
  uploadAvatar as uploadAvatarRemote,
  deleteAvatar as deleteAvatarRemote,
} from "#lib/remote/auth/avatar.remote.js";

export interface AvatarServiceResult {
  ok: boolean;
  image?: string;
  error?: string;
}

/**
 * Extract a user-facing message from a remote-function HttpError
 */
function remoteErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: { message?: string } }).body;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Upload avatar from file
 */
export async function uploadAvatar(file: File): Promise<AvatarServiceResult> {
  try {
    const data = await uploadAvatarRemote(file);
    return { ok: true, image: data.image };
  } catch (error) {
    return { ok: false, error: remoteErrorMessage(error, "Upload failed") };
  }
}

/**
 * Import avatar from URL (fetches URL client-side and uploads)
 */
export async function importAvatar(url: string): Promise<AvatarServiceResult> {
  try {
    // Fetch the image client-side and upload as file
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, error: "Failed to fetch image URL" };
    }
    const blob = await response.blob();
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    return uploadAvatar(file);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Delete current avatar
 */
export async function deleteAvatar(): Promise<AvatarServiceResult> {
  try {
    await deleteAvatarRemote();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: remoteErrorMessage(error, "Delete failed") };
  }
}
