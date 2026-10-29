import { renderDocumentMarkdown } from '#lib/platform/markdown/document-markdown.js';

/**
 * Strategy's name for the shared renderer. The implementation moved to
 * `platform/markdown` when Diagnostic needed the same stored-prose rendering;
 * this re-export keeps existing Strategy call sites unchanged.
 */
export const renderStrategyMarkdown = renderDocumentMarkdown;
