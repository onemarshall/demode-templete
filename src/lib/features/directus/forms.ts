/**
 * Client-side form submission to Directus.
 *
 * Handles file uploads and form submissions using the public Directus token.
 * For server-side form submission with private auth, see `forms/remote/directus-helpers.ts`.
 */
import { createDirectusClient } from "./client";
import { uploadFiles, createItem, withToken } from "@directus/sdk";
import { env } from "$env/dynamic/public";
import { createScopedLogger } from "$lib/shared/logger";

const log = createScopedLogger(["Directus", "Forms"]);

// Simple in-memory rate limit: one submission per form every 5 seconds.
// Prevents accidental double-submits and rapid-fire abuse from the same tab.
const submissionCooldowns = new Map<string, number>();
const RATE_LIMIT_MS = 5_000;

interface SubmissionValue {
  id: string;
  field: string;
  value?: string | null;
  file?: string | null;
  sort?: number | null;
}

export const submitForm = async (
  formId: string,
  fields: { id: string; name: string; type: string }[],
  data: Record<string, unknown>,
) => {
  const now = Date.now();
  if (now - (submissionCooldowns.get(formId) ?? 0) < RATE_LIMIT_MS) {
    throw new Error("Please wait a moment before submitting again");
  }
  submissionCooldowns.set(formId, now);

  const token = env.PUBLIC_DIRECTUS_FORM_TOKEN;
  if (!token) {
    throw new Error("PUBLIC_DIRECTUS_FORM_TOKEN is required");
  }

  const directus = createDirectusClient(fetch, token);

  try {
    const submissionValues: SubmissionValue[] = [];

    for (const field of fields) {
      const value = data[field.name];
      if (value === undefined || value === null) continue;

      if (field.type === "file" && value instanceof File) {
        const formData = new FormData();
        formData.append("file", value);

        const uploadedFile = await directus.request(withToken(token, uploadFiles(formData)));

        if (uploadedFile && typeof uploadedFile === "object" && "id" in uploadedFile) {
          submissionValues.push({
            id: crypto.randomUUID(),
            field: field.id,
            value: value.name ?? null,
            file: String(uploadedFile.id),
            sort: 0,
          });
        }
      } else {
        submissionValues.push({
          id: crypto.randomUUID(),
          field: field.id,
          value: value.toString(),
          sort: 0,
        });
      }
    }

    await directus.request(
      withToken(token, createItem("form_submissions", { form: formId, values: submissionValues })),
    );
  } catch (error) {
    log.error("Error submitting form:", error);
    throw new Error("Failed to submit form", { cause: error });
  }
};
