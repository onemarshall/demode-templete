import MarkdownIt from 'markdown-it';

/**
 * Render stored document text, never arbitrary stored HTML. No HTML/attribute
 * plugins are enabled; markdown-it escapes tags and rejects unsafe link schemes.
 * Images are disabled so private documents cannot initiate external image requests.
 *
 * Shared by every module that holds delivered prose (Strategy documents,
 * Diagnostic reports), so a change to sanitisation applies to all of them.
 */
const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false }).disable('image');

export function renderDocumentMarkdown(content: string): string {
	return markdown.render(content);
}
