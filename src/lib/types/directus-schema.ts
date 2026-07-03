export interface ExtensionSeoMetadata {
  title?: string;
  meta_description?: string;
  og_image?: string;
  additional_fields?: Record<string, unknown>;
  sitemap?: {
    change_frequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority: string;
  };
  no_index?: boolean;
  no_follow?: boolean;
}

export interface AiPrompt {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @description Unique name for the prompt. Use names like "create-article" or "generate-product-description". @required */
  name: string;
  /** @description Is this prompt published and available to use? */
  status?: "draft" | "in_review" | "published";
  /** @description Briefly explain what this prompt does in 1-2 sentences. */
  description?: string | null;
  /** @description Optional: Define the conversation structure between users and AI. Used to add context and improve outputs. */
  messages?: Array<{ role: "user" | "assistant"; text: string }> | null;
  /** @description Instructions that shape how the AI responds. */
  system_prompt?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface BlockAdvGallery {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  layout_styles?: `layout-a` | `layout-b` | `layout-c` | null;
  text?: string | null;
  images?: BlockAdvGalleryFile[] | string[];
}

export interface BlockAdvGalleryFile {
  /** @primaryKey */
  id: number;
  block_adv_gallery_id?: BlockAdvGallery | string | null;
  directus_files_id?: DirectusFile | string | null;
}

export interface BlockArticle {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  title?: string | null;
  content?: string | null;
  /** @description Select an Image or Video */
  media?: "none" | "image" | "video" | null;
  image?: DirectusFile | string | null;
  video?: "json" | null;
}

export interface BlockBannerCta {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  name?: string | null;
  title?: string | null;
  content?: string | null;
  image?: DirectusFile | string | null;
  button_group?: BlockButtonGroup | string | null;
  /** @description Toggle to show or hide the content section */
  show_content?: boolean | null;
  /** @description Select the theme for the banner appearance */
  theme?:
    | "default"
    | "primary"
    | "accent"
    | "sec"
    | "dark"
    | "gray"
    | `sec-light`
    | `accent-light`
    | `primary-light`
    | null;
  /** @description Select the theme for the banner appearance */
  background_colours?:
    | "default"
    | "dark"
    | "darker"
    | "light"
    | "lighter"
    | "gray"
    | `sec-light`
    | `accent-light`
    | `primary-light`
    | `bg-gradient-1`
    | `bg-gradient-2`
    | `gradient-3`
    | null;
}

export interface BlockBook {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  title?: string | null;
  subtitle?: string | null;
  /** @description Section label shown above the featured publication card. */
  featured_heading?: string | null;
  /** @description Badge text shown on the featured publication card. */
  featured_badge_label?: string | null;
  /** @description Section label shown above the new releases list. */
  new_releases_heading?: string | null;
  /** @description Section label shown above the full books grid. */
  all_books_heading?: string | null;
  /** @description Label used for the catch-all category and subcategory filters. */
  all_filter_label?: string | null;
  /** @description Label used for detail links and buttons. */
  view_details_label?: string | null;
  /** @description Label used for the external purchase button in the detail sheet. */
  buy_button_label?: string | null;
  /** @description When set, only books by this author are shown. Leave empty to show all authors with an interactive filter. */
  filter_by_author?: string | null;
  books?: BlockBooksItem[] | string[];
}

export interface BlockBooksItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  title?: string | null;
  image?: DirectusFile | string | null;
  books_group?: BlockBook | string | null;
  /** @description Author or editor credit shown with the publication. */
  author?: `andrew-linzey` | `clair-linzey` | null;
  /** @description Publication date used to automatically determine featured and new release items. */
  published_date?: string | null;
  /** @description Primary category used for filtering. */
  category?: string | null;
  /** @description Secondary category used for filtering. */
  subcategory?: string | null;
  /** @description Fallback solid cover color when no image is provided. */
  cover_color?: string | null;
  /** @description Short description used in cards and the detail sheet. */
  blurb?: string | null;
  /** @description External purchase link for the publication. */
  buy_link?: string | null;
  /** @description Manual override to pin this book as the featured publication. */
  is_featured?: boolean | null;
  /** @description Manual override to include this book in the new releases section. */
  is_new_release?: boolean | null;
}

export interface BlockButton {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Submit is for form submissions. */
  type?: "page" | "post" | "url" | "submit" | null;
  /** @description The internal page to link to. */
  page?: Page | string | null;
  /** @description The internal post to link to. */
  post?: Post | string | null;
  /** @description Text to include on the button. */
  label?: string | null;
  /** @description What type of button */
  variant?: "default" | "outline" | "pill" | "soft" | "ghost" | "link" | null;
  /** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
  url?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Built-in icon to use for the button */
  icon?: "arrow" | "plus" | null;
  /** @description Position of the icon relative to the label */
  iconPosition?: "left" | "right" | null;
  /** @description Additional CSS classes to apply to the button */
  class?: string | null;
  /** @description Whether the button is disabled */
  disabled?: boolean | null;
  /** @description Whether the button should take up full width */
  block?: boolean | null;
  /** @description Button size */
  button_size?: "default" | "sm" | "lg" | "icon" | null;
}

export interface BlockButtonGroup {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description The buttons in this group */
  buttons?: BlockButtonGroupButton[] | string[];
}

export interface BlockButtonGroupButton {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  block_button_group_id?: BlockButtonGroup | string | null;
  block_button_id?: BlockButton | string | null;
  /** @description Label for the button in the group */
  label?: string | null;
}

export interface BlockCard {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  header?: string | null;
  subheader?: string | null;
  link?: BlockButtonGroup | string | null;
  styles?: "v1" | "v2" | null;
  items?: BlockCardItem[] | string[];
}

export interface BlockCardItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: string | null;
  date_created?: string | null;
  user_updated?: string | null;
  date_updated?: string | null;
  /** @required */
  title: string;
  content?: string | null;
  image?: DirectusFile | string | null;
  card_group?: BlockCard | string | null;
  link?: ContentLink | string | null;
}

export interface BlockFeatureBigImage {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  headline?: string | null;
  description?: string | null;
  cta_label?: string | null;
  /** @description Show or hide the CTA link */
  show_cta?: boolean | null;
  cta_link?: ContentLink | string | null;
  image?: DirectusFile | string | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  /** @description Vertical word displayed alongside the headline */
  word?: string | null;
  layout?: "v1" | "v2" | "v3" | null;
}

export interface BlockFeatureHoverSplit {
  /** @primaryKey */
  id: string;
  headline?: string | null;
  subheadline?: string | null;
  items?: BlockFeatureHoverSplitItem[] | string[];
}

export interface BlockFeatureHoverSplitItem {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @required */
  title: string;
  description?: string | null;
  link_label?: string | null;
  overlay_strength?: "soft" | "medium" | "strong" | null;
  image?: DirectusFile | string | null;
  link?: ContentLink | string | null;
  hover_split_group?: BlockFeatureHoverSplit | string | null;
}

export interface BlockFeatureSplit {
  /** @primaryKey */
  id: number;
  headline?: string | null;
  subheadline?: string | null;
  items?: BlockFeatureSplitItem[] | string[];
}

export interface BlockFeatureSplitItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @required */
  title: string;
  description?: string | null;
  link_label?: string | null;
  theme?: "light" | "dark" | null;
  reverse_layout?: boolean | null;
  image?: DirectusFile | string | null;
  link?: ContentLink | string | null;
  feature_split_group?: BlockFeatureSplit | string | null;
}

export interface BlockFeatureSplitVideo {
  /** @primaryKey */
  id: number;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  title?: string | null;
  content?: string | null;
  content_column?: "5" | "6" | "7" | "8" | null;
  content_order?: "1" | "2" | null;
  /** @description Paragraph max width in 'ch' */
  content_paragraph_width?: string | null;
  content_button_text?: string | null;
  image?: DirectusFile | string | null;
  video?: "json" | null;
}

export interface BlockFeatureSticky {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  title?: string | null;
  Version?: "v1" | "v2" | null;
  items?: BlockFeatureStickyItem[] | string[];
}

export interface BlockFeatureStickyItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  items_list?: BlockFeatureSticky | string | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  title?: string | null;
  sub_title?: string | null;
  image?: DirectusFile | string | null;
}

export interface BlockFeatureVideo {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  title?: string | null;
  content?: string | null;
  /** @description Select or upload a video file. */
  video?: "json" | null;
  /** @description Select a page to link to. */
  link?: Page | string | null;
  link_text?: string | null;
}

export interface BlockFellowsList {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @required */
  headline: string;
  /** @description Placeholder text shown in the name search field */
  search_placeholder?: string | null;
  /** @description Label for the discipline filter tab */
  discipline_label?: string | null;
  /** @description Label for the region filter tab */
  region_label?: string | null;
  /** @description Label for the focus filter tab */
  focus_label?: string | null;
  /** @description Shared label for the reset option across all filters */
  all_label?: string | null;
  items?: BlockFellowsListItem[] | string[];
}

export interface BlockFellowsListItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @required */
  name: string;
  bio?: string | null;
  fellows_list_group?: BlockFellowsList | string | null;
  /** @description Fellow's academic discipline */
  discipline_id?: FellowsDiscipline | string | null;
  /** @description Fellow's geographic region */
  region_id?: FellowsRegion | string | null;
  /** @description Fellow's focus area */
  focus_id?: FellowsFocuse | string | null;
  /** @description Fellow's role/specialization */
  role_id?: FellowsRole | string | null;
  /** @description Job title and institution, e.g. Professor of Ethics, Purdue University */
  position?: string | null;
}

export interface BlockForm {
  /** @primaryKey */
  id: string;
  /** @description Form to show within block */
  form?: Form | string | null;
  /** @description Larger main headline for this page section. */
  headline?: string | null;
  /** @description Smaller copy shown above the headline to label a section or add extra context. */
  tagline?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface BlockGallery {
  /** @description Larger main headline for this page section. */
  headline?: string | null;
  /** @primaryKey */
  id: string;
  /** @description Smaller copy shown above the headline to label a section or add extra context. */
  tagline?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Images to include in the image gallery. */
  items?: BlockGalleryItem[] | string[];
}

export interface BlockGalleryItem {
  /** @primaryKey */
  id: string;
  /** @description The id of the gallery block this item belongs to. */
  block_gallery?: BlockGallery | string | null;
  /** @description The id of the file included in the gallery. */
  directus_file?: DirectusFile | string | null;
  sort?: number | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface BlockGlobalBannerRef {
  /** @primaryKey */
  id: number;
  /** @description Select the master banner to display */
  banner_reference?: BlockBannerCta | string | null;
}

export interface BlockGlobalBooksRef {
  /** @primaryKey */
  id: number;
  /** @description Select the master books block to display. */
  books_reference?: BlockBook | string | null;
}

export interface BlockGlobalFellowsListRef {
  /** @primaryKey */
  id: number;
  /** @description Select the master fellows list to display */
  fellows_list_reference?: BlockFellowsList | string | null;
}

export interface BlockGlobalVideoRef {
  /** @primaryKey */
  id: number;
  block_feature_video?: BlockFeatureVideo | string | null;
}

export interface BlockHero {
  /** @description Larger main headline for this page section. */
  headline?: string | null;
  /** @primaryKey */
  id: string;
  /** @description Featured image in the hero. */
  image?: DirectusFile | string | null;
  /** @description Action buttons that show below headline and description. */
  button_group?: BlockButtonGroup | string | null;
  /** @description Supporting copy that shows below the headline. */
  description?: string | null;
  /** @description The vertical position for the hero content: top, middle, or bottom. */
  layout?: "top" | "middle" | "bottom" | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  word?: string | null;
  video?: "json" | null;
}

export interface BlockImageDivider {
  /** @primaryKey */
  id: string;
  /** @description Optional title for the image divider section */
  title?: string | null;
  /** @description Image to display in the divider section */
  image?: DirectusFile | string | null;
}

export interface BlockPost {
  /** @primaryKey */
  id: string;
  /** @description Larger main headline for this page section. */
  headline?: string | null;
  /** @description The collection of content to fetch and display on the page within this block. @required */
  collection: "posts";
  /** @description Smaller copy shown above the headline to label a section or add extra context. */
  tagline?: string | null;
  limit?: number | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Optional category to filter the displayed posts. */
  category?: Category | string | null;
  /** @description Only display posts marked as featured. */
  featured_only?: boolean | null;
  /** @description Optional post type to filter the displayed posts. */
  post_type?: "article" | "essay" | "news" | "event" | "interview" | "review" | null;
  tags?: BlockPostsTag[] | string[];
  /** @description Visual layout for the block. `grid` is the default 3-column card grid; `featured-list` renders a compact landing-page teaser (1 featured post + minimal list). */
  layout?: "grid" | "featured-list" | null;
}

export interface BlockPostsTag {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  block_posts_id?: BlockPost | string | null;
  tag_id?: Tag | string | null;
}

export interface BlockPricing {
  /** @primaryKey */
  id: string;
  /** @description Larger main headline for this page section. */
  headline?: string | null;
  /** @description Smaller copy shown above the headline to label a section or add extra context. */
  tagline?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description The individual pricing cards to display. */
  pricing_cards?: BlockPricingCard[] | string[];
}

export interface BlockPricingCard {
  /** @primaryKey */
  id: string;
  /** @description Name of the pricing plan. Shown at the top of the card. */
  title?: string | null;
  /** @description Short, one sentence description of the pricing plan and who it is for. */
  description?: string | null;
  /** @description Price and term for the pricing plan. (ie `$199/mo`) */
  price?: string | null;
  /** @description Badge that displays at the top of the pricing plan card to add helpful context. */
  badge?: string | null;
  /** @description Short list of features included in this plan. Press `Enter` to add another item to the list. */
  features?: "json" | null;
  /** @description The action button / link shown at the bottom of the pricing card. */
  button?: BlockButton | string | null;
  /** @description The id of the pricing block this card belongs to. */
  pricing?: BlockPricing | string | null;
  /** @description Add highlighted border around the pricing plan to make it stand out. */
  is_highlighted?: boolean | null;
  sort?: number | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface BlockRichtext {
  /** @description Rich text content for this block. */
  content?: string | null;
  /** @description Larger main headline for this page section. */
  headline?: string | null;
  /** @primaryKey */
  id: string;
  /** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
  alignment?: "left" | "center" | null;
  /** @description Smaller copy shown above the headline to label a section or add extra context. */
  tagline?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface BlockSponsor {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  headline?: string | null;
  description?: string | null;
  items?: BlockSponsorsItem[] | string[];
}

export interface BlockSponsorsItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  /** @required */
  name: string;
  description?: string | null;
  logo?: DirectusFile | string | null;
  /** @description External website link */
  url?: string | null;
  type?: "organisation" | "individual" | null;
  sponsors_block?: BlockSponsor | string | null;
}

export interface BlockStat {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  /** @description Section heading displayed above the stats grid */
  header?: string | null;
  /** @description Small eyebrow text above the header */
  subheader?: string | null;
  /** @description Stat items in this block */
  items?: BlockStatsItem[] | string[];
}

export interface BlockStatsItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  /** @description The number to animate to @required */
  value: number;
  /** @description Text after the number, e.g. + */
  suffix?: string | null;
  /** @description Short title below the number @required */
  label: string;
  /** @description Supporting paragraph text */
  description?: string | null;
  /** @description Animal icon to display as watermark */
  icon_key?:
    | "centre_books"
    | "journal_of_animal_ethics"
    | "research_fellows"
    | "fellows"
    | "video"
    | "impact"
    | "our_research"
    | null;
  /** @description Span two columns in the grid */
  wide?: boolean | null;
  stats_block?: BlockStat | string | null;
}

export interface BlockTeaserCardItem {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  user_created?: string | null;
  date_created?: string | null;
  user_updated?: string | null;
  date_updated?: string | null;
  /** @required */
  title: string;
  label?: string | null;
  teaser_cards_group?: BlockTeaserCard | string | null;
  image?: DirectusFile | string | null;
  link?: ContentLink | string | null;
  /** @description Short description shown below the card title. */
  description?: string | null;
}

export interface BlockTeaserCard {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  user_created?: string | null;
  date_created?: string | null;
  user_updated?: string | null;
  date_updated?: string | null;
  header?: string | null;
  /** @description When enabled, card images are rendered with a blue duotone effect. */
  duotone?: boolean | null;
  description?: string | null;
  label?: string | null;
  items?: BlockTeaserCardItem[] | string[];
}

export interface BlockTypographyImageText {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  layout?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | null;
  title?: string | null;
  content?: string | null;
  image?: DirectusFile | string | null;
  /** @description Toggle button visibility */
  show_button?: boolean | null;
  buttons?: BlockButtonGroup | string | null;
  /** @description Toggle image visibility */
  show_image?: boolean | null;
  /** @description Toggle content visibility */
  show_content?: boolean | null;
  /** @description Optional label displayed above the title */
  label?: string | null;
  image_second?: DirectusFile | string | null;
  video?: "json" | null;
  /** @description Toggle video visibility */
  show_video?: boolean | null;
}

export interface BlockTypographyIntro {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
  layout?: "v1" | "v2" | null;
  title?: string | null;
  content?: string | null;
  image?: DirectusFile | string | null;
}

export interface BlockTypographyStyleA {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @required */
  title: string;
  /** @required */
  headline: string;
  /** @description Decorative icon watermark for the title panel */
  icon_key?:
    | "centre_books"
    | "journal_of_animal_ethics"
    | "research_fellows"
    | "fellows"
    | "video"
    | "impact"
    | "our_research"
    | "directors"
    | "about"
    | "aims"
    | "our_news"
    | "history"
    | "animal_ethics"
    | "latest_news"
    | "commentary"
    | "research_areas"
    | "honorary_fellows"
    | "apply_to_be_a_fellow"
    | "previous_meetings"
    | "the_animal_thing"
    | null;
  statements?: BlockTypographyStyleAItem[] | string[];
}

export interface BlockTypographyStyleAItem {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @required */
  statement: string;
  typography_style_a_group?: BlockTypographyStyleA | string | null;
}

export interface BlockVideo {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: string | null;
  date_created?: string | null;
  user_updated?: string | null;
  date_updated?: string | null;
  /** @description Optional heading shown above the video grid */
  title?: string | null;
  /** @description Optional intro copy shown under the title */
  subtitle?: string | null;
  /** @description Label for the 'show all categories' filter button */
  all_filter_label?: string | null;
  /** @description Small label shown above the featured video hero (e.g. 'Featured lecture') */
  featured_heading?: string | null;
  /** @description Text for the pill badge overlaid on the featured video thumbnail */
  featured_badge_label?: string | null;
  /** @description Vimeo videos shown in this archive block */
  videos?: BlockVideosItem[] | string[];
}

export interface BlockVideosItem {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  user_created?: string | null;
  date_created?: string | null;
  user_updated?: string | null;
  date_updated?: string | null;
  /** @description The numeric Vimeo video ID (e.g. 76979871) — not the full URL @required */
  vimeo_id: string;
  /** @description Optional override for the video title (falls back to Vimeo title) */
  title?: string | null;
  /** @description Short summary shown under the video card */
  description?: string | null;
  /** @description Used for the filter sidebar (e.g. Lecture, Interview, Panel) */
  category?: string | null;
  /** @description Highlight this video with a 'Featured' badge */
  featured?: boolean | null;
  videos_block?: BlockVideo | string | null;
}

export interface Category {
  /** @primaryKey */
  id: string;
  status?: "published" | "draft" | "archived";
  sort?: number | null;
  /** @required */
  title: string;
  /** @description Unique URL-friendly identifier for this category @required */
  slug: string;
  description?: string | null;
}

export interface ContentLink {
  /** @primaryKey */
  id: string;
  /** @required */
  type: "page" | "post" | "url";
  /** @description Label shown to the user for the menu item. @required */
  title: string;
  /** @description The internal page to link to. */
  page?: Page | string | null;
  /** @description The internal post to link to. */
  post?: Post | string | null;
  /** @description The URL to link to. Could be relative or external. */
  url?: string | null;
  sort?: number | null;
  user_created?: string | null;
  date_created?: string | null;
  user_updated?: string | null;
  date_updated?: string | null;
  block_card_items?: BlockCardItem[] | string[];
}

export interface FellowsDiscipline {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @description Discipline name @required */
  name: string;
}

export interface FellowsFocuse {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @description Focus area name @required */
  name: string;
}

export interface FellowsRegion {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @description Region name @required */
  name: string;
}

export interface FellowsRole {
  /** @primaryKey */
  id: number;
  sort?: number | null;
  /** @description Role name @required */
  name: string;
}

export interface FormField {
  /** @primaryKey */
  id: string;
  /** @description Unique field identifier, not shown to users (lowercase, hyphenated) */
  name?: string | null;
  /** @description Input type for the field */
  type?:
    | "text"
    | "textarea"
    | "checkbox"
    | "checkbox_group"
    | "radio"
    | "file"
    | "select"
    | "hidden"
    | null;
  /** @description Text label shown to form users. */
  label?: string | null;
  /** @description Default text shown in empty input. */
  placeholder?: string | null;
  /** @description Additional instructions shown below the input */
  help?: string | null;
  /** @description Available rules: `email`, `url`, `min:5`, `max:20`, `length:10`. Combine with pipes example: `email|max:255` */
  validation?: string | null;
  /** @description Field width on the form */
  width?: "100" | "67" | "50" | "33" | null;
  /** @description Options for radio or select inputs */
  choices?: Array<{ text: string; value: string }> | null;
  /** @description Parent form this field belongs to. */
  form?: Form | string | null;
  sort?: number | null;
  /** @description Make this field mandatory to complete. */
  required?: boolean | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface FormSubmissionValue {
  /** @primaryKey */
  id: string;
  /** @description Parent form submission for this value. */
  form_submission?: FormSubmission | string | null;
  field?: FormField | string | null;
  /** @description The data entered by the user for this specific field in the form submission. */
  value?: string | null;
  sort?: number | null;
  file?: DirectusFile | string | null;
  /** @description Form submission date and time. */
  timestamp?: string | null;
}

export interface FormSubmission {
  /** @description Unique ID for this specific form submission @primaryKey */
  id: string;
  /** @description Form submission date and time. */
  timestamp?: string | null;
  /** @description Associated form for this submission. */
  form?: Form | string | null;
  /** @description Submitted field responses */
  values?: FormSubmissionValue[] | string[];
}

export interface Form {
  /** @primaryKey */
  id: string;
  /** @description Action after successful submission. */
  on_success?: "redirect" | "message" | null;
  sort?: number | null;
  /** @description Text shown on submit button. */
  submit_label?: string | null;
  /** @description Message shown after successful submission. */
  success_message?: string | null;
  /** @description Form name (for internal reference). */
  title?: string | null;
  /** @description Destination URL after successful submission. */
  success_redirect_url?: string | null;
  /** @description Show or hide this form from the site. */
  is_active?: boolean | null;
  /** @description Setup email notifications when forms are submitted. */
  emails?: Array<{ to: string[]; subject: string; message: string }> | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Form structure and input fields */
  fields?: FormField[] | string[];
  /** @description Received form responses. */
  submissions?: FormSubmission[] | string[];
}

export interface Globals {
  /** @description Site summary for search results. */
  description?: string | null;
  /** @primaryKey */
  id: string;
  /** @description Social media profile URLs */
  social_links?: Array<{
    url: string;
    service:
      | "facebook"
      | "instagram"
      | "linkedin"
      | "x"
      | "vimeo"
      | "youtube"
      | "github"
      | "discord"
      | "docker";
  }> | null;
  /** @description Short phrase describing the site. */
  tagline?: string | null;
  /** @description Main site title */
  title?: string | null;
  /** @description Public URL for the website */
  url?: string | null;
  /** @description Small icon for browser tabs. 1:1 ratio. No larger than 512px × 512px. */
  favicon?: DirectusFile | string | null;
  /** @description Main logo shown on the site (for light mode). */
  logo?: DirectusFile | string | null;
  /** @description Secret OpenAI API key. Don't share with anyone outside your team. */
  openai_api_key?: string | null;
  /** @description The public URL for this Directus instance. Used in Flows. */
  directus_url?: string | null;
  /** @description Main logo shown on the site (for dark mode). */
  logo_dark_mode?: DirectusFile | string | null;
  /** @description Accent color for the website (used on buttons, links, etc). */
  accent_color?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Business address */
  address?: string | null;
  /** @description Google Analytics ID */
  analytics_id?: string | null;
  /** @description Company name */
  company?: string | null;
  google_search_console?: string | null;
  business_type?: "nonprofit" | "commercial" | "personal" | "educational" | null;
  /** @description i.e Crafted with love by... */
  footer_design_by_content?: string | null;
  vat_number?: string | null;
  /** @description Name of the company that designed the website */
  footer_design_by_name?: string | null;
  cdn_url?: string | null;
  /** @description Site domain name */
  domain?: string | null;
  /** @description Main logo shown on the site for mobile only. */
  logo_mobile?: DirectusFile | string | null;
}

export interface Navigation {
  /** @description Unique identifier for this menu. Can't be edited after creation. @primaryKey */
  id: string;
  /** @description What is the name of this menu? Only used internally. */
  title?: string | null;
  /** @description Show or hide this menu from the site. */
  is_active?: boolean | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Links within the menu. */
  items?: NavigationItem[] | string[];
}

export interface NavigationItem {
  /** @primaryKey */
  id: string;
  /** @description Navigation menu that the individual links belong to. */
  navigation?: Navigation | string | null;
  /** @description The internal page to link to. */
  page?: Page | string | null;
  /** @description The parent navigation item. */
  parent?: NavigationItem | string | null;
  sort?: number | null;
  /** @description Label shown to the user for the menu item. @required */
  title: string;
  /** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
  type?: "page" | "post" | "url" | "group" | null;
  /** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
  url?: string | null;
  /** @description The internal post to link to. */
  post?: Post | string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  /** @description Show or hide this menu item from rendered navigation. */
  is_visible?: boolean | null;
  /** @description Controls whether this item appears in the main navbar. */
  show_in_navbar?: boolean | null;
  /** @description Controls whether this item appears in morph navigation variants. */
  show_in_morph?: boolean | null;
  /** @description Morph group identifier used by frontend navigation variants. */
  morph?: string | null;
  /** @description Hide dropdown UI for this item even if children exist. */
  hide_dropdown?: boolean | null;
  /** @description Controls whether this item is included in sitemap/footer navigation. */
  show_in_sitemap?: boolean | null;
  /** @description Optional icon key for UI mapping (store icon name, not component). */
  icon?:
    | ``
    | "directors"
    | "researchfellows"
    | "aims"
    | "history"
    | "impact"
    | "animalethics"
    | "latestnews"
    | "commentary"
    | "video"
    | "ournews"
    | "about"
    | "researchareas"
    | `our-research`
    | "centrebooks"
    | "pmanimalethicsseries"
    | "journalofanimalethics"
    | "fellows"
    | "honoraryfellows"
    | "applytoobeafellow"
    | "previousmeetings"
    | "theanimalth"
    | null;
  /** @description Label text shown for the navigation item */
  label?: string | null;
  /** @description Controls whether this item shows a label */
  show_label?: boolean | null;
  /** @description Optional section header shown above this item in the dropdown. Set this on the first item of each group. */
  nav_title?: string | null;
  /** @description Add child menu items within the group. */
  children?: NavigationItem[] | string[];
}

export interface PageBlock {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @description The id of the page that this block belongs to. */
  page?: Page | string | null;
  /** @description The data for the block. */
  item?:
    | BlockHero
    | BlockRichtext
    | BlockForm
    | BlockPost
    | BlockGallery
    | BlockGlobalBannerRef
    | BlockTypographyIntro
    | BlockCard
    | BlockTeaserCard
    | BlockFeatureSplit
    | BlockFeatureHoverSplit
    | BlockFeatureSticky
    | BlockFeatureBigImage
    | BlockGlobalFellowsListRef
    | BlockGlobalBooksRef
    | BlockImageDivider
    | BlockGlobalVideoRef
    | BlockStat
    | BlockSponsor
    | BlockTypographyImageText
    | BlockAdvGallery
    | BlockVideo
    | string
    | null;
  /** @description The collection (type of block). */
  collection?: string | null;
  /** @description Temporarily hide this block on the website without having to remove it from your page. */
  hide_block?: boolean | null;
  /** @description Background color for the block to create contrast. Does not control dark or light mode for the entire site. */
  background?: "light" | "dark" | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface Page {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  /** @description The title of this page. @required */
  title: string;
  /** @description Unique URL for this page (start with `/`, can have multiple segments `/about/me`)). @required */
  permalink: string;
  /** @description Is this page published? */
  status?: "draft" | "in_review" | "published";
  /** @description Publish now or schedule for later. */
  published_at?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  seo?: ExtensionSeoMetadata | null;
  /** @description Create and arrange different content blocks (like text, images, or videos) to build your page. */
  blocks?: PageBlock[] | string[];
}

export interface PostImage {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  post_id?: Post | string | null;
  directus_files_id?: DirectusFile | string | null;
}

export interface PostTag {
  /** @primaryKey */
  id: string;
  sort?: number | null;
  post_id?: Post | string | null;
  tag_id?: Tag | string | null;
}

export interface Post {
  /** @description Rich text content of your blog post. */
  content?: string | null;
  /** @primaryKey */
  id: string;
  /** @description Featured image for this post. Used in cards linking to the post and in the post detail page. */
  image?: DirectusFile | string | null;
  /** @description Unique URL for this post (e.g., `yoursite.com/posts/{{your-slug}}`) */
  slug?: string | null;
  sort?: number | null;
  /** @description Is this post published? */
  status?: "draft" | "in_review" | "published";
  /** @description Title of the blog post (used in page title and meta tags) @required */
  title: string;
  /** @description Short summary of the blog post to entice readers. */
  description?: string | null;
  /** @description Select the team member who wrote this post */
  author?: DirectusUser | string | null;
  /** @description Publish now or schedule for later. */
  published_at?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
  seo?: ExtensionSeoMetadata | null;
  /** @description Editorial format of the post */
  post_type?: "article" | "essay" | "news" | "event" | "interview" | "review" | null;
  /** @description Feature this post in curated listings */
  featured?: boolean | null;
  /** @description Original WordPress post ID for import reconciliation */
  wordpress_post_id?: string | null;
  video?: "json" | null;
  /** @description Primary editorial category for this post */
  category?: Category | string | null;
  /** @description Auto-calculated from content. Estimated minutes to read. */
  read_time?: number | null;
  tags?: PostTag[] | string[];
  images?: PostImage[] | string[];
}

export interface Redirect {
  /** @primaryKey */
  id: string;
  response_code?: "301" | "302" | null;
  /** @description Old URL has to be relative to the site (ie `/blog` or `/news`). It cannot be a full url like (https://example.com/blog) */
  url_from?: string | null;
  /** @description The URL you're redirecting to. This can be a relative url (/resources/matt-is-cool) or a full url (https://example.com/blog). */
  url_to?: string | null;
  /** @description Short explanation of why the redirect was created. */
  note?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  date_updated?: string | null;
  user_updated?: DirectusUser | string | null;
}

export interface Tag {
  /** @primaryKey */
  id: string;
  status?: "published" | "draft" | "archived";
  /** @required */
  title: string;
  /** @description Unique URL-friendly identifier for this tag @required */
  slug: string;
  description?: string | null;
  posts?: PostTag[] | string[];
}

export interface Theme {
  /** @primaryKey */
  id: string;
  status?: "published" | "draft" | "archived";
  sort?: number | null;
  /** @description Primary brand color used across key UI elements. */
  brand_primary?: string | null;
  /** @description Secondary brand color used for contrast and backgrounds. */
  brand_secondary?: string | null;
  /** @description Accent brand color for highlights and calls to action. */
  brand_accent?: string | null;
  /** @description Active font set identifier (for example FontSetV1). */
  font?: string | null;
  /** @description Primary typeface name. */
  font_primary?: string | null;
  /** @description Secondary typeface name. */
  font_secondary?: string | null;
  /** @description Navbar layout variant. */
  navbar?: "Mega" | "Flex" | "Morphing" | "Floating" | "Draw" | "Header" | "Basic" | null;
  /** @description Folder key used for theme-level static assets. */
  folder?: string | null;
  /** @description Image folder key used for theme-level image assets. */
  imagefolder?: string | null;
  /** @description Footer color theme token. */
  footer_theme?: string | null;
  /** @description Footer style variant. */
  footer_style?: "f1" | "f2" | "f3" | "f4" | "f5" | "f6" | "f7" | "f8" | "f9" | "f10" | null;
  /** @description Enable or disable theme animations. */
  animation?: boolean | null;
  /** @description Split mode for animation effects. */
  fx_split?: "chars" | "lines" | null;
  /** @description Split mode used specifically for line animation effects. */
  fx_split_line?: "chars" | "lines" | null;
  /** @description Animation FX preset style. */
  fx_style?:
    | "FxType1"
    | "FxType2"
    | "FxType3"
    | "FxType5"
    | "FxType6"
    | "FxType7"
    | "FxType8"
    | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  user_updated?: DirectusUser | string | null;
  date_updated?: string | null;
}

export interface DirectusAccess {
  /** @primaryKey */
  id: string;
  role?: DirectusRole | string | null;
  user?: DirectusUser | string | null;
  policy?: DirectusPolicy | string;
  sort?: number | null;
}

export interface DirectusActivity {
  /** @primaryKey */
  id: number;
  action?: string;
  user?: DirectusUser | string | null;
  timestamp?: string;
  ip?: string | null;
  user_agent?: string | null;
  collection?: string;
  item?: string;
  origin?: string | null;
  revisions?: DirectusRevision[] | string[];
}

export interface DirectusCollection {
  /** @primaryKey */
  collection: string;
  icon?: string | null;
  note?: string | null;
  display_template?: string | null;
  hidden?: boolean;
  singleton?: boolean;
  translations?: Array<{
    language: string;
    translation: string;
    singular: string;
    plural: string;
  }> | null;
  archive_field?: string | null;
  archive_app_filter?: boolean;
  archive_value?: string | null;
  unarchive_value?: string | null;
  sort_field?: string | null;
  accountability?: "all" | "activity" | null | null;
  color?: string | null;
  item_duplication_fields?: "json" | null;
  sort?: number | null;
  group?: DirectusCollection | string | null;
  collapse?: string;
  preview_url?: string | null;
  versioning?: boolean;
}

export interface DirectusComment {
  /** @primaryKey */
  id: string;
  collection?: DirectusCollection | string;
  item?: string;
  comment?: string;
  date_created?: string | null;
  date_updated?: string | null;
  user_created?: DirectusUser | string | null;
  user_updated?: DirectusUser | string | null;
}

export interface DirectusField {
  /** @primaryKey */
  id: number;
  collection?: DirectusCollection | string;
  field?: string;
  special?: string[] | null;
  interface?: string | null;
  options?: "json" | null;
  display?: string | null;
  display_options?: "json" | null;
  readonly?: boolean;
  hidden?: boolean;
  sort?: number | null;
  width?: string | null;
  translations?: "json" | null;
  note?: string | null;
  conditions?: "json" | null;
  required?: boolean | null;
  group?: DirectusField | string | null;
  validation?: "json" | null;
  validation_message?: string | null;
  searchable?: boolean;
}

export interface DirectusFile {
  /** @primaryKey */
  id: string;
  storage?: string;
  filename_disk?: string | null;
  filename_download?: string;
  title?: string | null;
  type?: string | null;
  folder?: DirectusFolder | string | null;
  uploaded_by?: DirectusUser | string | null;
  created_on?: string;
  modified_by?: DirectusUser | string | null;
  modified_on?: string;
  charset?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  embed?: string | null;
  description?: string | null;
  location?: string | null;
  tags?: string[] | null;
  metadata?: "json" | null;
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  tus_id?: string | null;
  tus_data?: "json" | null;
  uploaded_on?: string | null;
}

export interface DirectusFolder {
  /** @primaryKey */
  id: string;
  name?: string;
  parent?: DirectusFolder | string | null;
}

export interface DirectusMigration {
  /** @primaryKey */
  version: string;
  name?: string;
  timestamp?: string | null;
}

export interface DirectusPermission {
  /** @primaryKey */
  id: number;
  collection?: string;
  action?: string;
  permissions?: "json" | null;
  validation?: "json" | null;
  presets?: "json" | null;
  fields?: string[] | null;
  policy?: DirectusPolicy | string;
}

export interface DirectusPolicy {
  /** @primaryKey */
  id: string;
  /** @required */
  name: string;
  icon?: string;
  description?: string | null;
  ip_access?: string[] | null;
  enforce_tfa?: boolean;
  admin_access?: boolean;
  app_access?: boolean;
  permissions?: DirectusPermission[] | string[];
  users?: DirectusAccess[] | string[];
  roles?: DirectusAccess[] | string[];
}

export interface DirectusPreset {
  /** @primaryKey */
  id: number;
  bookmark?: string | null;
  user?: DirectusUser | string | null;
  role?: DirectusRole | string | null;
  collection?: string | null;
  search?: string | null;
  layout?: string | null;
  layout_query?: "json" | null;
  layout_options?: "json" | null;
  refresh_interval?: number | null;
  filter?: "json" | null;
  icon?: string | null;
  color?: string | null;
}

export interface DirectusRelation {
  /** @primaryKey */
  id: number;
  many_collection?: string;
  many_field?: string;
  one_collection?: string | null;
  one_field?: string | null;
  one_collection_field?: string | null;
  one_allowed_collections?: string[] | null;
  junction_field?: string | null;
  sort_field?: string | null;
  one_deselect_action?: string;
}

export interface DirectusRevision {
  /** @primaryKey */
  id: number;
  activity?: DirectusActivity | string;
  collection?: string;
  item?: string;
  data?: "json" | null;
  delta?: "json" | null;
  parent?: DirectusRevision | string | null;
  version?: DirectusVersion | string | null;
}

export interface DirectusRole {
  /** @primaryKey */
  id: string;
  /** @required */
  name: string;
  icon?: string;
  description?: string | null;
  parent?: DirectusRole | string | null;
  children?: DirectusRole[] | string[];
  policies?: DirectusAccess[] | string[];
  users?: DirectusUser[] | string[];
}

export interface DirectusSession {
  /** @primaryKey */
  token: string;
  user?: DirectusUser | string | null;
  expires?: string;
  ip?: string | null;
  user_agent?: string | null;
  share?: DirectusShare | string | null;
  origin?: string | null;
  next_token?: string | null;
}

export interface DirectusSettings {
  /** @primaryKey */
  id: number;
  project_name?: string;
  project_url?: string | null;
  project_color?: string;
  project_logo?: DirectusFile | string | null;
  public_foreground?: DirectusFile | string | null;
  public_background?: DirectusFile | string | null;
  public_note?: string | null;
  auth_login_attempts?: number | null;
  auth_password_policy?:
    | null
    | `/^.{8,}$/`
    | `/(?=^.{8,}$)(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{';'?>.<,])(?!.*\\s).*$/`
    | null;
  storage_asset_transform?: "all" | "none" | "presets" | null;
  storage_asset_presets?: Array<{
    key: string;
    fit: "contain" | "cover" | "inside" | "outside";
    width: number;
    height: number;
    quality: number;
    withoutEnlargement: boolean;
    format: "auto" | "jpeg" | "png" | "webp" | "tiff" | "avif";
    transforms: "json";
  }> | null;
  custom_css?: string | null;
  storage_default_folder?: DirectusFolder | string | null;
  basemaps?: Array<{
    name: string;
    type: "raster" | "tile" | "style";
    url: string;
    tileSize: number;
    attribution: string;
  }> | null;
  mapbox_key?: string | null;
  module_bar?: "json" | null;
  project_descriptor?: string | null;
  default_language?: string;
  custom_aspect_ratios?: Array<{ text: string; value: number }> | null;
  public_favicon?: DirectusFile | string | null;
  default_appearance?: "auto" | "light" | "dark";
  default_theme_light?: string | null;
  theme_light_overrides?: "json" | null;
  default_theme_dark?: string | null;
  theme_dark_overrides?: "json" | null;
  report_error_url?: string | null;
  report_bug_url?: string | null;
  report_feature_url?: string | null;
  public_registration?: boolean;
  public_registration_verify_email?: boolean;
  public_registration_role?: DirectusRole | string | null;
  public_registration_email_filter?: "json" | null;
  visual_editor_urls?: Array<{ url: string }> | null;
  project_id?: string | null;
  mcp_enabled?: boolean;
  mcp_allow_deletes?: boolean;
  mcp_prompts_collection?: string | null;
  mcp_system_prompt_enabled?: boolean;
  mcp_system_prompt?: string | null;
  project_owner?: string | null;
  project_usage?: string | null;
  org_name?: string | null;
  product_updates?: boolean | null;
  project_status?: string | null;
  ai_openai_api_key?: string | null;
  ai_anthropic_api_key?: string | null;
  ai_system_prompt?: string | null;
  ai_google_api_key?: string | null;
  ai_openai_compatible_api_key?: string | null;
  ai_openai_compatible_base_url?: string | null;
  ai_openai_compatible_name?: string | null;
  ai_openai_compatible_models?: Array<{
    id: string;
    name: string;
    context: number;
    output: number;
    attachment: boolean;
    reasoning: boolean;
    providerOptions: Record<string, any>;
  }> | null;
  ai_openai_compatible_headers?: Array<{ header: string; value: string }> | null;
  ai_openai_allowed_models?: Array<
    | `gpt-4o-mini`
    | `gpt-4.1-nano`
    | `gpt-4.1-mini`
    | `gpt-4.1`
    | `gpt-5-nano`
    | `gpt-5-mini`
    | `gpt-5`
    | `gpt-5.2`
    | `gpt-5.2-chat-latest`
    | `gpt-5.2-pro`
    | `gpt-5.4`
    | `gpt-5.4-pro`
  > | null;
  ai_anthropic_allowed_models?: Array<
    | `claude-haiku-4-5`
    | `claude-sonnet-4-5`
    | `claude-opus-4-5`
    | `claude-sonnet-4-6`
    | `claude-opus-4-6`
  > | null;
  ai_google_allowed_models?: Array<
    | `gemini-3-pro-preview`
    | `gemini-3-flash-preview`
    | `gemini-2.5-pro`
    | `gemini-2.5-flash`
    | `gemini-3.1-pro-preview`
    | `gemini-3.1-flash-lite-preview`
    | `gemini-2.5-flash-lite`
  > | null;
  collaborative_editing_enabled?: boolean;
  /** @description Settings for the Command Palette Module. */
  command_palette_settings?: Record<string, any> | null;
}

export interface DirectusUser {
  /** @primaryKey */
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  password?: string | null;
  location?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  avatar?: DirectusFile | string | null;
  language?: string | null;
  tfa_secret?: string | null;
  status?: "draft" | "invited" | "unverified" | "active" | "suspended" | "archived";
  role?: DirectusRole | string | null;
  token?: string | null;
  last_access?: string | null;
  last_page?: string | null;
  provider?: string;
  external_identifier?: string | null;
  auth_data?: "json" | null;
  email_notifications?: boolean | null;
  appearance?: null | "auto" | "light" | "dark" | null;
  theme_dark?: string | null;
  theme_light?: string | null;
  theme_light_overrides?: "json" | null;
  theme_dark_overrides?: "json" | null;
  text_direction?: "auto" | "ltr" | "rtl";
  /** @description Blog posts this user has authored. */
  posts?: Post[] | string[];
  policies?: DirectusAccess[] | string[];
}

export interface DirectusDashboard {
  /** @primaryKey */
  id: string;
  name?: string;
  icon?: string;
  note?: string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  color?: string | null;
  panels?: DirectusPanel[] | string[];
}

export interface DirectusPanel {
  /** @primaryKey */
  id: string;
  dashboard?: DirectusDashboard | string;
  name?: string | null;
  icon?: string | null;
  color?: string | null;
  show_header?: boolean;
  note?: string | null;
  type?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  options?: "json" | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
}

export interface DirectusNotification {
  /** @primaryKey */
  id: number;
  timestamp?: string | null;
  status?: string | null;
  recipient?: DirectusUser | string;
  sender?: DirectusUser | string | null;
  subject?: string;
  message?: string | null;
  collection?: string | null;
  item?: string | null;
}

export interface DirectusShare {
  /** @primaryKey */
  id: string;
  name?: string | null;
  collection?: DirectusCollection | string;
  item?: string;
  role?: DirectusRole | string | null;
  password?: string | null;
  user_created?: DirectusUser | string | null;
  date_created?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  times_used?: number | null;
  max_uses?: number | null;
}

export interface DirectusFlow {
  /** @primaryKey */
  id: string;
  name?: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  status?: string;
  trigger?: string | null;
  accountability?: string | null;
  options?: "json" | null;
  operation?: DirectusOperation | string | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  operations?: DirectusOperation[] | string[];
}

export interface DirectusOperation {
  /** @primaryKey */
  id: string;
  name?: string | null;
  key?: string;
  type?: string;
  position_x?: number;
  position_y?: number;
  options?: "json" | null;
  resolve?: DirectusOperation | string | null;
  reject?: DirectusOperation | string | null;
  flow?: DirectusFlow | string;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
}

export interface DirectusTranslation {
  /** @primaryKey */
  id: string;
  /** @required */
  language: string;
  /** @required */
  key: string;
  /** @required */
  value: string;
}

export interface DirectusVersion {
  /** @primaryKey */
  id: string;
  key?: string;
  name?: string | null;
  collection?: DirectusCollection | string;
  item?: string;
  hash?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  user_created?: DirectusUser | string | null;
  user_updated?: DirectusUser | string | null;
  delta?: "json" | null;
}

export interface DirectusExtension {
  enabled?: boolean;
  /** @primaryKey */
  id: string;
  folder?: string;
  source?: string;
  bundle?: string | null;
}

export interface DirectusDeployment {
  /** @primaryKey */
  id: string;
  provider?: string;
  credentials?: string | null;
  options?: "json" | null;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  webhook_ids?: "json" | null;
  webhook_secret?: string | null;
  last_synced_at?: string | null;
  projects?: DirectusDeploymentProject[] | string[];
}

export interface DirectusDeploymentProject {
  /** @primaryKey */
  id: string;
  deployment?: DirectusDeployment | string;
  external_id?: string;
  name?: string;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  url?: string | null;
  framework?: string | null;
  deployable?: boolean;
  runs?: DirectusDeploymentRun[] | string[];
}

export interface DirectusDeploymentRun {
  /** @primaryKey */
  id: string;
  project?: DirectusDeploymentProject | string;
  external_id?: string;
  target?: string;
  date_created?: string | null;
  user_created?: DirectusUser | string | null;
  status?: string | null;
  url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface Schema {
  ai_prompts: AiPrompt[];
  block_adv_gallery: BlockAdvGallery[];
  block_adv_gallery_files: BlockAdvGalleryFile[];
  block_articles: BlockArticle[];
  block_banner_cta: BlockBannerCta[];
  block_books: BlockBook[];
  block_books_items: BlockBooksItem[];
  block_button: BlockButton[];
  block_button_group: BlockButtonGroup[];
  block_button_group_buttons: BlockButtonGroupButton[];
  block_card: BlockCard[];
  block_card_items: BlockCardItem[];
  block_feature_big_image: BlockFeatureBigImage[];
  block_feature_hover_split: BlockFeatureHoverSplit[];
  block_feature_hover_split_items: BlockFeatureHoverSplitItem[];
  block_feature_split: BlockFeatureSplit[];
  block_feature_split_items: BlockFeatureSplitItem[];
  block_feature_split_video: BlockFeatureSplitVideo[];
  block_feature_sticky: BlockFeatureSticky[];
  block_feature_sticky_items: BlockFeatureStickyItem[];
  block_feature_video: BlockFeatureVideo[];
  block_fellows_list: BlockFellowsList[];
  block_fellows_list_items: BlockFellowsListItem[];
  block_form: BlockForm[];
  block_gallery: BlockGallery[];
  block_gallery_items: BlockGalleryItem[];
  block_global_banner_ref: BlockGlobalBannerRef[];
  block_global_books_ref: BlockGlobalBooksRef[];
  block_global_fellows_list_ref: BlockGlobalFellowsListRef[];
  block_global_video_ref: BlockGlobalVideoRef[];
  block_hero: BlockHero[];
  block_image_divider: BlockImageDivider[];
  block_posts: BlockPost[];
  block_posts_tags: BlockPostsTag[];
  block_pricing: BlockPricing[];
  block_pricing_cards: BlockPricingCard[];
  block_richtext: BlockRichtext[];
  block_sponsors: BlockSponsor[];
  block_sponsors_items: BlockSponsorsItem[];
  block_stats: BlockStat[];
  block_stats_items: BlockStatsItem[];
  block_teaser_card_items: BlockTeaserCardItem[];
  block_teaser_cards: BlockTeaserCard[];
  block_typography_image_text: BlockTypographyImageText[];
  block_typography_intro: BlockTypographyIntro[];
  block_typography_style_a: BlockTypographyStyleA[];
  block_typography_style_a_items: BlockTypographyStyleAItem[];
  block_videos: BlockVideo[];
  block_videos_items: BlockVideosItem[];
  categories: Category[];
  content_links: ContentLink[];
  fellows_disciplines: FellowsDiscipline[];
  fellows_focuses: FellowsFocuse[];
  fellows_regions: FellowsRegion[];
  fellows_roles: FellowsRole[];
  form_fields: FormField[];
  form_submission_values: FormSubmissionValue[];
  form_submissions: FormSubmission[];
  forms: Form[];
  globals: Globals;
  navigation: Navigation[];
  navigation_items: NavigationItem[];
  page_blocks: PageBlock[];
  pages: Page[];
  post_images: PostImage[];
  post_tags: PostTag[];
  posts: Post[];
  redirects: Redirect[];
  tags: Tag[];
  themes: Theme[];
  directus_access: DirectusAccess[];
  directus_activity: DirectusActivity[];
  directus_collections: DirectusCollection[];
  directus_comments: DirectusComment[];
  directus_fields: DirectusField[];
  directus_files: DirectusFile[];
  directus_folders: DirectusFolder[];
  directus_migrations: DirectusMigration[];
  directus_permissions: DirectusPermission[];
  directus_policies: DirectusPolicy[];
  directus_presets: DirectusPreset[];
  directus_relations: DirectusRelation[];
  directus_revisions: DirectusRevision[];
  directus_roles: DirectusRole[];
  directus_sessions: DirectusSession[];
  directus_settings: DirectusSettings;
  directus_users: DirectusUser[];
  directus_dashboards: DirectusDashboard[];
  directus_panels: DirectusPanel[];
  directus_notifications: DirectusNotification[];
  directus_shares: DirectusShare[];
  directus_flows: DirectusFlow[];
  directus_operations: DirectusOperation[];
  directus_translations: DirectusTranslation[];
  directus_versions: DirectusVersion[];
  directus_extensions: DirectusExtension[];
  directus_deployments: DirectusDeployment[];
  directus_deployment_projects: DirectusDeploymentProject[];
  directus_deployment_runs: DirectusDeploymentRun[];
}

export enum CollectionNames {
  ai_prompts = "ai_prompts",
  block_adv_gallery = "block_adv_gallery",
  block_adv_gallery_files = "block_adv_gallery_files",
  block_articles = "block_articles",
  block_banner_cta = "block_banner_cta",
  block_books = "block_books",
  block_books_items = "block_books_items",
  block_button = "block_button",
  block_button_group = "block_button_group",
  block_button_group_buttons = "block_button_group_buttons",
  block_card = "block_card",
  block_card_items = "block_card_items",
  block_feature_big_image = "block_feature_big_image",
  block_feature_hover_split = "block_feature_hover_split",
  block_feature_hover_split_items = "block_feature_hover_split_items",
  block_feature_split = "block_feature_split",
  block_feature_split_items = "block_feature_split_items",
  block_feature_split_video = "block_feature_split_video",
  block_feature_sticky = "block_feature_sticky",
  block_feature_sticky_items = "block_feature_sticky_items",
  block_feature_video = "block_feature_video",
  block_fellows_list = "block_fellows_list",
  block_fellows_list_items = "block_fellows_list_items",
  block_form = "block_form",
  block_gallery = "block_gallery",
  block_gallery_items = "block_gallery_items",
  block_global_banner_ref = "block_global_banner_ref",
  block_global_books_ref = "block_global_books_ref",
  block_global_fellows_list_ref = "block_global_fellows_list_ref",
  block_global_video_ref = "block_global_video_ref",
  block_hero = "block_hero",
  block_image_divider = "block_image_divider",
  block_posts = "block_posts",
  block_posts_tags = "block_posts_tags",
  block_pricing = "block_pricing",
  block_pricing_cards = "block_pricing_cards",
  block_richtext = "block_richtext",
  block_sponsors = "block_sponsors",
  block_sponsors_items = "block_sponsors_items",
  block_stats = "block_stats",
  block_stats_items = "block_stats_items",
  block_teaser_card_items = "block_teaser_card_items",
  block_teaser_cards = "block_teaser_cards",
  block_typography_image_text = "block_typography_image_text",
  block_typography_intro = "block_typography_intro",
  block_typography_style_a = "block_typography_style_a",
  block_typography_style_a_items = "block_typography_style_a_items",
  block_videos = "block_videos",
  block_videos_items = "block_videos_items",
  categories = "categories",
  content_links = "content_links",
  fellows_disciplines = "fellows_disciplines",
  fellows_focuses = "fellows_focuses",
  fellows_regions = "fellows_regions",
  fellows_roles = "fellows_roles",
  form_fields = "form_fields",
  form_submission_values = "form_submission_values",
  form_submissions = "form_submissions",
  forms = "forms",
  globals = "globals",
  navigation = "navigation",
  navigation_items = "navigation_items",
  page_blocks = "page_blocks",
  pages = "pages",
  post_images = "post_images",
  post_tags = "post_tags",
  posts = "posts",
  redirects = "redirects",
  tags = "tags",
  themes = "themes",
  directus_access = "directus_access",
  directus_activity = "directus_activity",
  directus_collections = "directus_collections",
  directus_comments = "directus_comments",
  directus_fields = "directus_fields",
  directus_files = "directus_files",
  directus_folders = "directus_folders",
  directus_migrations = "directus_migrations",
  directus_permissions = "directus_permissions",
  directus_policies = "directus_policies",
  directus_presets = "directus_presets",
  directus_relations = "directus_relations",
  directus_revisions = "directus_revisions",
  directus_roles = "directus_roles",
  directus_sessions = "directus_sessions",
  directus_settings = "directus_settings",
  directus_users = "directus_users",
  directus_dashboards = "directus_dashboards",
  directus_panels = "directus_panels",
  directus_notifications = "directus_notifications",
  directus_shares = "directus_shares",
  directus_flows = "directus_flows",
  directus_operations = "directus_operations",
  directus_translations = "directus_translations",
  directus_versions = "directus_versions",
  directus_extensions = "directus_extensions",
  directus_deployments = "directus_deployments",
  directus_deployment_projects = "directus_deployment_projects",
  directus_deployment_runs = "directus_deployment_runs",
}
