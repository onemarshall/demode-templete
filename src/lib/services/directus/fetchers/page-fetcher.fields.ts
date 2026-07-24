/**
 * Page fetcher field definitions.
 *
 * Defines which fields to request from Directus for each block type.
 * Split into two groups:
 *
 * - `BLOCK_ITEM_FIELDS` — fetched inline with the main page query (lightweight blocks).
 * - `BLOCK_*_FIELDS` constants — fetched separately via hydration (blocks with deep
 *   relational data like fellows, books, banners with button groups).
 *
 * Also exports `PAGE_FIELDS` (the main page query shape) and `POSTS_FIELDS`.
 */
import { type QueryFields } from "@directus/sdk";
import { type Page, type Schema } from "$lib/types/directus-schema";

export const BLOCK_BUTTON_FIELDS = [
  "id",
  "label",
  "variant",
  "url",
  "type",
  "button_size",
  { page: ["permalink"] },
  { post: ["slug"] },
] as const;

// block_button_group_buttons is a junction table — actual button data lives on block_button_id
export const BUTTON_FIELDS = ["id", "label", { block_button_id: BLOCK_BUTTON_FIELDS }] as const;

export const FORM_FIELDS = [
  "id",
  "title",
  "submit_label",
  "success_message",
  "on_success",
  "success_redirect_url",
  "is_active",
  {
    fields: [
      "id",
      "name",
      "type",
      "label",
      "placeholder",
      "help",
      "validation",
      "width",
      "choices",
      "required",
      "sort",
    ],
  },
] as const;

// Inline-fetched blocks: small payloads, included in the main page query.
// Heavy blocks are hydrated separately via HYDRATION_CONFIGS in page-fetcher.ts
// to keep the main query URL under proxy header-size limits (HTTP 431).
export const BLOCK_ITEM_FIELDS = {
  block_richtext: ["id", "tagline", "headline", "content", "alignment"],
  block_image_divider: ["id", "title", "image"],
  block_template: ["id", "title", "description"],
  block_adv_gallery: ["id", "layout_styles", "text", { images: ["id", "directus_files_id"] }],
  block_gallery: ["id", "tagline", "headline", { items: ["id", "directus_file", "sort"] }],
  block_typography_intro: [
    "id",
    "title",
    "content",
    "layout",
    "image",
    {
      button_group: ["id"],
    },
  ],
  block_typography_style_a: [
    "id",
    "title",
    "headline",
    "icon_key",
    {
      statements: ["id", "statement", "sort"],
    },
  ],
  block_feature_video: ["id", "title", "content", "video", { link: ["permalink"] }],
} as const;

// ── Hydrated block fields (fetched separately per-block, not in main query) ──

export const BLOCK_PRICING_FIELDS = [
  "id",
  "tagline",
  "headline",
  {
    pricing_cards: [
      "id",
      "title",
      "description",
      "price",
      "badge",
      "features",
      "is_highlighted",
      { button: ["id", "label", "variant", "url", "type"] },
    ],
  },
] as const;

export const BLOCK_HERO_FIELDS = [
  "id",
  "headline",
  "description",
  "layout",
  "word",
  "video",
  "image",
  "show_event_info",
  "event_badge",
  "event_date",
  "event_location",
  {
    button_group: ["id", { buttons: BUTTON_FIELDS }],
  },
] as const;

export const BLOCK_POSTS_FIELDS = [
  "id",
  "tagline",
  "headline",
  "collection",
  "limit",
  "featured_only",
  "post_type",
  "layout",
  {
    category: ["id", "title", "slug", "description"],
  },
  {
    tags: [{ tag_id: ["id", "title", "slug", "description"] }],
  },
] as const;

export const BLOCK_FORM_FIELDS = [
  "id",
  "tagline",
  "headline",
  "layout",
  { form: FORM_FIELDS },
] as const;

export const BLOCK_GLOBAL_VIDEO_REF_FIELDS = [
  "id",
  {
    block_feature_video: ["id", "title", "content", "video", { link: ["permalink"] }],
  },
] as const;

export const BLOCK_CARD_FIELDS = [
  "id",
  "header",
  "subheader",
  "styles",
  {
    link: ["id", { buttons: BUTTON_FIELDS }],
  },
  {
    items: [
      "id",
      "title",
      "content",
      "image",
      {
        link: ["id", "type", "url", { page: ["permalink"] }, { post: ["slug"] }],
      },
      "sort",
    ],
  },
] as const;

export const BLOCK_FEATURE_SPLIT_FIELDS = [
  "id",
  "headline",
  "subheadline",
  {
    items: [
      "id",
      "title",
      "description",
      "link_label",
      "theme",
      "image",
      "reverse_layout",
      {
        link: ["id", "type", "url", { page: ["permalink"] }, { post: ["slug"] }],
      },
      "sort",
    ],
  },
] as const;

export const BLOCK_FEATURE_HOVER_SPLIT_FIELDS = [
  "id",
  "headline",
  "subheadline",
  {
    items: [
      "id",
      "title",
      "description",
      "link_label",
      "image",
      "overlay_strength",
      {
        link: ["id", "type", "url", { page: ["permalink"] }, { post: ["slug"] }],
      },
      "sort",
    ],
  },
] as const;

export const BLOCK_FEATURE_STICKY_FIELDS = [
  "id",
  "title",
  "Version",
  {
    items: [
      "id",
      "title",
      "sub_title",
      "image",
      "sort",
      "show_cta",
      "cta_label",
      { cta_link: ["type", "url", { page: ["permalink"] }, { post: ["slug"] }] },
    ],
  },
] as const;

export const BLOCK_TYPOGRAPHY_IMAGE_TEXT_FIELDS = [
  "id",
  "layout",
  "label",
  "title",
  "content",
  { image: ["id", "focal_point_x", "focal_point_y", "width", "height"] },
  { image_second: ["id", "focal_point_x", "focal_point_y", "width", "height"] },
  "show_image",
  "show_content",
  "show_button",
  "show_video",
  "video",
  "show_event_info",
  "subtitle",
  "partner_name",
  "partner_url",
  { programme_pdf: ["id", "filename_download", "title", "type"] },
  "programme_pdf_label",
  "gallery_url",
  { press_release_post: ["id", "slug", "title"] },
  "press_release_post_label",
  {
    buttons: ["id", { buttons: BUTTON_FIELDS }],
  },
] as const;

export const BLOCK_FEATURE_BIG_IMAGE_FIELDS = [
  "id",
  "headline",
  "description",
  "word",
  "layout",
  "cta_label",
  "show_cta",
  { image: ["id", "focal_point_x", "focal_point_y", "width", "height"] },
  {
    cta_link: ["id", "type", "url", { page: ["permalink"] }, { post: ["slug"] }],
  },
] as const;

export const BLOCK_BANNER_CTA_FIELDS = [
  "id",
  "name",
  "title",
  "content",
  "show_content",
  "theme",
  "image",
  {
    button_group: ["id", { buttons: BUTTON_FIELDS }],
  },
] as const;

export const BLOCK_GLOBAL_BANNER_REF_FIELDS = [
  "id",
  {
    banner_reference: [
      "id",
      "name",
      "title",
      "content",
      "show_content",
      "theme",
      "image",
      {
        button_group: ["id", { buttons: BUTTON_FIELDS }],
      },
    ],
  },
] as const;

const FELLOWS_LIST_ITEM_FIELDS = [
  "id",
  "name",
  "position",
  { role_id: ["id", "name"] },
  { discipline_id: ["id", "name"] },
  { region_id: ["id", "name"] },
  { focus_id: ["id", "name"] },
  "bio",
  "sort",
] as const;

const FELLOWS_LIST_CORE_FIELDS = [
  "id",
  "headline",
  "search_placeholder",
  "discipline_label",
  "region_label",
  "focus_label",
  "all_label",
  { items: FELLOWS_LIST_ITEM_FIELDS },
] as const;

export const BLOCK_FELLOWS_LIST_FIELDS = FELLOWS_LIST_CORE_FIELDS;

export const BLOCK_GLOBAL_FELLOWS_LIST_REF_FIELDS = [
  "id",
  {
    fellows_list_reference: FELLOWS_LIST_CORE_FIELDS,
  },
] as const;

export const BLOCK_GLOBAL_BOOKS_REF_FIELDS = [
  "id",
  {
    books_reference: [
      "id",
      "title",
      "subtitle",
      "featured_heading",
      "featured_badge_label",
      "new_releases_heading",
      "all_books_heading",
      "all_filter_label",
      "view_details_label",
      "buy_button_label",
      {
        books: [
          "id",
          "sort",
          "title",
          "author",
          "published_date",
          "category",
          "subcategory",
          "cover_color",
          "blurb",
          "buy_link",
          "image",
          "is_featured",
          "is_new_release",
        ],
      },
    ],
  },
] as const;

export const BLOCK_STATS_FIELDS = [
  "id",
  "header",
  "subheader",
  {
    items: ["id", "value", "suffix", "label", "description", "icon_key", "wide", "sort"],
  },
] as const;

export const BLOCK_SPONSORS_FIELDS = [
  "id",
  "headline",
  "description",
  {
    items: ["id", "name", "description", "logo", "url", "type", "sort"],
  },
] as const;

export const BLOCK_PHOTO_GALLERY_FIELDS = [
  "id",
  "title",
  "subtitle",
  {
    images: [
      "id",
      "sort",
      { directus_files_id: ["id", "title", "filename_download", "width", "height"] },
    ],
  },
] as const;

export const BLOCK_TEASER_CARDS_FIELDS = [
  "id",
  "label",
  "header",
  "description",
  "duotone",
  "duotone_color",
  {
    items: [
      "id",
      "title",
      "label",
      "badge",
      "image",
      {
        link: ["id", "title", "type", "url", { page: ["permalink"] }, { post: ["slug"] }],
      },
      "sort",
    ],
  },
] as const;

export const BLOCK_VIDEOS_FIELDS = [
  "id",
  "title",
  "subtitle",
  "all_filter_label",
  "featured_heading",
  "featured_badge_label",
  {
    videos: ["id", "sort", "vimeo_id", "title", "description", "category", "featured"],
  },
] as const;

export const PAGE_FIELDS = [
  "id",
  "title",
  "seo",
  "blocks",
  {
    blocks: [
      "id",
      "background",
      "collection",
      "item",
      "sort",
      "hide_block",
      { item: BLOCK_ITEM_FIELDS },
    ],
  },
] as unknown as QueryFields<Schema, Page>;

export const POSTS_FIELDS = [
  "id",
  "title",
  "description",
  "slug",
  "image",
  "status",
  "published_at",
  "featured",
  "post_type",
  {
    category: ["id", "title", "slug"],
  },
  {
    tags: [{ tag_id: ["id", "title", "slug"] }],
  },
] as const;
