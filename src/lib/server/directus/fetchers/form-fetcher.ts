/**
 * Newsletter form fetcher.
 *
 * Fetches form definitions (fields, labels, validation) from Directus
 * via raw fetch to the REST API. Used for rendering dynamic forms on the client.
 */
import type { FormField } from "$lib/types/directus-schema";
import { createScopedLogger } from "$lib/utils/logger";
import { PUBLIC_DIRECTUS_URL } from "$app/env/public";

const log = createScopedLogger(["Directus", "Forms"]);

interface NewsletterForm {
  id: string;
  title: string;
  fields: FormField[];
  submitLabel: string;
  successMessage: string;
}

export async function fetchNewsletterForm(
  fetch: typeof globalThis.fetch,
  token?: string,
): Promise<NewsletterForm | null> {
  try {
    const directusUrl = PUBLIC_DIRECTUS_URL || "http://localhost:8701";
    const response = await fetch(
      `${directusUrl}/items/forms/5da3d356-d818-434f-b225-db35c418bbb6?fields=*,fields.*`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );

    if (!response.ok) {
      log.error("Failed to fetch newsletter form:", response.statusText);
      return null;
    }

    const { data: form } = await response.json();

    if (!form?.id) return null;

    return {
      id: form.id,
      title: form.title,
      fields: form.fields || [],
      submitLabel: form.submit_label || "Subscribe",
      successMessage: form.success_message || "Thanks for subscribing!",
    };
  } catch (error) {
    log.error("Error fetching newsletter form:", error);
    return null;
  }
}
