import { defineEnvVars } from "@sveltejs/kit/hooks";
import { z } from "zod";

const optionalNonEmptyString = z
  .union([z.string().min(1), z.literal("")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));
const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const variables = defineEnvVars({
  CMS_PROVIDER: {
    description: "Private CMS provider override: static, directus, or wordpress.",
  },
  PUBLIC_CMS_PROVIDER: {
    public: true,
    description: "Browser-visible CMS provider fallback: static, directus, or wordpress.",
  },
  PUBLIC_SITE_URL: {
    public: true,
    description: "Canonical public site URL used by metadata, feeds, and CSP.",
  },
  PUBLIC_DIRECTUS_URL: {
    public: true,
    description: "Public Directus URL used for assets and browser-safe editor features.",
  },
  DIRECTUS_URL: {
    description: "Private Directus URL for server-only integrations.",
  },
  DIRECTUS_TOKEN: {
    description: "Private Directus token for server-side reads and writes.",
  },
  DRAFT_MODE_SECRET: {
    schema: optionalNonEmptyString,
    description: "Private preview token used to enable draft-mode content.",
  },
  PUBLIC_ENABLE_VISUAL_EDITING: {
    public: true,
    description: "Enables Directus visual editing when paired with the visual-editing query flag.",
  },
  PUBLIC_WORDPRESS_URL: {
    public: true,
    schema: optionalUrl,
    description: "Public WordPress base URL when the WordPress provider is enabled.",
  },
  WORDPRESS_URL: {
    schema: optionalUrl,
    description: "Private WordPress base URL override for server-side provider use.",
  },
});
