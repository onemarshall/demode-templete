import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

export function renderMarkdown(content: string): string {
  return md.render(content ?? "");
}

/**
 * Recursively walks JSON-like data and renders every `content` string field
 * from Markdown to HTML in place. This keeps markdown-it out of the client
 * bundle because this module is only imported by server-side fetchers.
 */
export function renderMarkdownInData(data: unknown): void {
  if (data === null || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      renderMarkdownInData(item);
    }
    return;
  }

  const record = data as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === "content" && typeof value === "string") {
      record[key] = renderMarkdown(value);
    } else {
      renderMarkdownInData(value);
    }
  }
}
