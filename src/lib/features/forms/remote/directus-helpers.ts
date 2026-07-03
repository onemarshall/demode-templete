/**
 * Directus Form Submission Helpers
 *
 * This module provides server-side helpers for submitting forms to Directus CMS.
 * It handles the complete form submission workflow including field mapping,
 * data transformation, and API communication.
 *
 * Key Features:
 * - Fetches form field definitions from Directus
 * - Maps field names to Directus field IDs
 * - Transforms submission data into Directus format
 * - Handles authentication and rate limiting
 * - Provides comprehensive error handling and logging
 *
 * Usage:
 * ```typescript
 * import { submitDirectusForm } from '$lib/features/forms/remote/directus-helpers'
 *
 * // In a form action endpoint
 * export const actions = {
 *   default: async ({ request }) => {
 *     const data = await request.formData()
 *     const formId = 'your-form-id'
 *     const submissionData = Object.fromEntries(data.entries())
 *
 *     const formTitle = await submitDirectusForm(formId, submissionData)
 *     return { success: true, formTitle }
 *   }
 * }
 * ```
 *
 * Architecture:
 * - Uses request-scoped fetch for reading form definitions
 * - Uses SDK client for writing (rate limiting + retry)
 * - Separates read/write operations for optimal performance
 */

import { getRequestEvent } from "$app/server";
import { DIRECTUS_TOKEN } from "$app/env/private";
import { PUBLIC_DIRECTUS_URL } from "$app/env/public";
import { createDirectusClientServer } from "$lib/features/directus/client.server";
import { createItem } from "@directus/sdk";
import { error } from "@sveltejs/kit";
import type { FormSubmission, FormSubmissionValue } from "$lib/types/directus-schema";
import { createScopedLogger } from "$lib/shared/logger";

const log = createScopedLogger(["Forms", "Directus"]);

type FieldRow = { id: string; name: string | null };
type FormRow = { title: string; fields: FieldRow[] };

/**
 * Shared helper: fetch a Directus form's field name→ID map, then submit form_submission_values.
 * - Read uses request-scoped fetch (avoids SDK generic field-query typing issues)
 * - Write uses createDirectusClientServer for rate-limiting, retry, and auth
 */
export async function submitDirectusForm(
  formId: string,
  submissionData: Record<string, string>,
): Promise<string> {
  const { fetch } = getRequestEvent();
  const token = DIRECTUS_TOKEN;

  // Fetch form field name→ID mapping
  const formResponse = await fetch(
    `${PUBLIC_DIRECTUS_URL}/items/forms/${formId}?fields=title,fields.id,fields.name`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!formResponse.ok) {
    log.error("Failed to fetch form fields:", formResponse.statusText);
    error(500, "Failed to fetch form details");
  }
  const { data: form } = (await formResponse.json()) as { data: FormRow };

  const fieldMap = new Map<string, string>(
    (form.fields ?? []).filter((f) => f.id && f.name).map((f) => [f.name!, f.id]),
  );

  const values: FormSubmissionValue[] = Object.entries(submissionData)
    .filter(([name]) => fieldMap.has(name))
    .map(([name, value]) => ({
      id: crypto.randomUUID(),
      field: fieldMap.get(name) as string,
      value: String(value ?? ""),
      sort: 0,
    }));

  // Submit using the SDK client (gets rate-limiting + retry for the write)
  const client = createDirectusClientServer(fetch);
  await client.request(
    createItem("form_submissions", { form: formId, values } as Partial<FormSubmission>),
  );

  return form.title;
}
