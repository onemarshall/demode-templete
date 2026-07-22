declare module "markdown-it" {
	export default class MarkdownIt {
		constructor(options?: {
			html?: boolean;
			linkify?: boolean;
			typographer?: boolean;
			breaks?: boolean;
		});
		render(content: string): string;
	}
}
