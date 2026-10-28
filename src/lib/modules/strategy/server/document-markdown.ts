import MarkdownIt from 'markdown-it';

/** Render stored document text, never arbitrary stored HTML. No HTML/attribute
 * plugins are enabled; markdown-it escapes tags and rejects unsafe link schemes.
 * Images are disabled so private documents cannot initiate external image requests.
 */
const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false }).disable('image');
export function renderStrategyMarkdown(content: string): string {
	return markdown.render(content);
}
