import { z } from "zod";

export interface NavigationItem {
  id: string;
  title: string;
  type: "page" | "post" | "url" | "group";
  url?: string;
  sort?: number;
  is_visible?: boolean;
  show_in_navbar?: boolean;
  show_in_morph?: boolean;
  show_in_sitemap?: boolean;
  show_icon_mobile?: boolean;
  show_icon_desktop?: boolean;
  morph?: string;
  show_children?: boolean;
  hide_dropdown?: boolean;
  nav_title?: string;
  icon?: string;
  label?: string;
  show_label?: boolean;
  page?: {
    id: string;
    title: string;
    permalink?: string;
    status: string;
  };
  post?: {
    id: string;
    title: string;
    permalink?: string;
    status: string;
  };
  children?: NavigationItem[];
}

const NavigationLinkedContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  permalink: z.string().optional(),
  status: z.string(),
});

export const NavigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(["page", "post", "url", "group"]),
    url: z.string().optional(),
    sort: z.number().optional(),
    is_visible: z.boolean().optional(),
    show_in_navbar: z.boolean().optional(),
    show_in_morph: z.boolean().optional(),
    show_in_sitemap: z.boolean().optional(),
    show_icon_mobile: z.boolean().optional(),
    show_icon_desktop: z.boolean().optional(),
    morph: z.string().optional(),
    show_children: z.boolean().optional(),
    hide_dropdown: z.boolean().optional(),
    nav_title: z.string().optional(),
    icon: z.string().optional(),
    label: z.string().optional(),
    show_label: z.boolean().optional(),
    page: NavigationLinkedContentSchema.optional(),
    post: NavigationLinkedContentSchema.optional(),
    children: z.array(NavigationItemSchema).optional(),
  }),
);

export const NavigationTreeSchema = z.array(NavigationItemSchema);
export type NavigationTree = z.infer<typeof NavigationTreeSchema>;

export const SiteGlobalsSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  url: z.string().optional(),
  domain: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  business_type: z
    .enum(["nonprofit", "commercial", "personal", "educational"])
    .nullable()
    .optional(),
  address: z.string().nullable().optional(),
  vat_number: z.string().nullable().optional(),
  accent_color: z.string().optional(),
  favicon: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  logo_mobile: z.string().nullable().optional(),
  logo_dark_mode: z.string().nullable().optional(),
  social_links: z
    .array(
      z.object({
        service: z.enum([
          "facebook",
          "instagram",
          "linkedin",
          "x",
          "vimeo",
          "youtube",
          "github",
          "discord",
          "docker",
        ]),
        url: z.string(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  analytics_id: z.string().nullable().optional(),
  google_search_console: z.string().nullable().optional(),
  openai_api_key: z.string().optional(),
  directus_url: z.string().optional(),
  cdn_url: z.string().nullable().optional(),
  footer_design_by_name: z.string().nullable().optional(),
  footer_design_by_content: z.string().nullable().optional(),
});

export type SiteGlobals = z.infer<typeof SiteGlobalsSchema>;

export const SiteDataSchema = z.object({
  globals: SiteGlobalsSchema,
  headerNavigation: NavigationTreeSchema,
  footerNavigation: NavigationTreeSchema,
  copyrightNavigation: NavigationTreeSchema.optional(),
  newsletterForm: z
    .object({
      id: z.string(),
      title: z.string(),
      fields: z.array(z.any()),
      submitLabel: z.string(),
      successMessage: z.string(),
    })
    .nullable(),
});

export type SiteData = z.infer<typeof SiteDataSchema>;

export const PageModelSchema = z.object({
  path: z.string(),
  title: z.string(),
  blocks: z.array(z.unknown()),
});

export type PageModel = z.infer<typeof PageModelSchema>;

export const BlockThemeSchema = z.enum(["light", "dark"]);

export const BlockHeroItemSchema = z.object({
  id: z.string(),
  headline: z.string(),
  description: z.string(),
  layout: z.enum(["left", "center", "right"]).default("left"),
});

export const BlockRichTextItemSchema = z.object({
  id: z.string(),
  tagline: z.string().optional(),
  headline: z.string().optional(),
  content: z.string(),
  alignment: z.enum(["left", "center", "right"]).default("left"),
});

export const BlockFormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "tel", "textarea"]),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
});

export const BlockFormItemSchema = z.object({
  id: z.string(),
  tagline: z.string().optional(),
  headline: z.string().optional(),
  submit_label: z.string(),
  success_message: z.string().optional(),
  fields: z.array(BlockFormFieldSchema),
});

// Shared shape for all page builder blocks — item uses z.any() to avoid
// rigid strictness during migration, matching the Directus schema.
const pageBlockShape = <T extends z.ZodTypeAny>(collection: T) =>
  z.object({
    id: z.string(),
    collection,
    sort: z.number().int().nullable().optional(),
    hide_block: z.boolean().optional(),
    background: BlockThemeSchema.optional(),
    item: z.any(),
  });

const pageBuilderBlockCollections = [
  "block_hero",
  "block_richtext",
  "block_form",
  "block_gallery",
  "block_pricing",
  "block_posts",
  "block_template",
  "block_image_divider",
  "block_banner",
  "block_teaser_cards",
  "block_fellows_list",
  "block_global_fellows_list_ref",
  "block_global_books_ref",
  "block_feature_split",
  "block_feature_hover_split",
  "block_feature_big_image",
] as const;

export const PageBuilderBlockSchema = z.union([
  ...pageBuilderBlockCollections.map((collection) => pageBlockShape(z.literal(collection))),
  // Fallback for unknown blocks during migration
  pageBlockShape(z.string()),
]);

export type PageBuilderBlock = z.infer<typeof PageBuilderBlockSchema>;

export const PageBuilderModelSchema = z.object({
  path: z.string(),
  title: z.string(),
  blocks: z.array(PageBuilderBlockSchema),
});

export type PageBuilderModel = z.infer<typeof PageBuilderModelSchema>;

const PostCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
});

const PostTagSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
});

const PostTypeSchema = z.enum(["article", "essay", "news", "event", "interview", "review"]);

const PostAuthorSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  avatar: z.any().nullable().optional(),
});

export type PostAuthor = z.infer<typeof PostAuthorSchema>;

export const PostSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  image: z.any().optional(),
  published_at: z.string().optional(),
  featured: z.boolean().optional(),
  post_type: PostTypeSchema.optional(),
  category: PostCategorySchema.nullable().optional(),
  tags: z.array(PostTagSchema).optional(),
  author: PostAuthorSchema.nullable().optional(),
  read_time: z.number().nullable().optional(),
});

export type PostSummary = z.infer<typeof PostSummarySchema>;

export const PostDetailSchema = PostSummarySchema.extend({
  content: z.string().optional(),
  seo: z.any().optional(),
  author: z.any().optional(),
});

export type PostDetail = z.infer<typeof PostDetailSchema>;
