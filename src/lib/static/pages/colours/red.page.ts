import { PageBuilderModelSchema, type PageBuilderModel } from '$lib/content/schema';

export const demoPage: PageBuilderModel = PageBuilderModelSchema.parse({
	path: '/colours/red',
	title: 'red',
	blocks: [
		{
			id: 'red-about-001',
			collection: 'block_hero',
			sort: 1,
			background: 'light',
			item: {
				id: 'hero-item-about-001',
				headline: 'Colour ',
				description: 'Red page for colours.',
				layout: 'left'
			}
		},
		{
			id: 'hero-001',
			collection: 'block_hero',
			sort: 1,
			background: 'light',
			item: {
				id: 'hero-item-001',
				headline: 'Prototype with Directus-like Block Shape',
				description:
					'This hero block is static fixture data that mirrors how Directus page-builder blocks are shaped.',
				layout: 'left'
			}
		}
	]
});
