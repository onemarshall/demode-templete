import { PageBuilderModelSchema, type PageBuilderModel } from '$lib/content/schema';

export const pageBuilderStaticExample: PageBuilderModel = PageBuilderModelSchema.parse({
	path: '/examples/page-builder-prototype',
	title: 'Page Builder Prototype',
	blocks: [
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
		},
		{
			id: 'richtext-001',
			collection: 'block_richtext',
			sort: 2,
			background: 'dark',
			item: {
				id: 'richtext-item-001',
				tagline: 'Like-for-like migration path',
				headline: 'Static data using CMS block conventions',
				content:
					'When your static fixtures use the same collection + item structure as Directus, switching providers becomes a mapping exercise rather than a UI rewrite.',
				alignment: 'left'
			}
		},
		{
			id: 'form-001',
			collection: 'block_form',
			sort: 3,
			background: 'light',
			item: {
				id: 'form-item-001',
				tagline: 'Prototype form block',
				headline: 'Contact form fixture',
				submit_label: 'Send Message',
				success_message: 'Thanks! We received your message.',
				fields: [
					{
						id: 'field-name',
						name: 'name',
						label: 'Name',
						type: 'text',
						placeholder: 'Jane Doe',
						required: true
					},
					{
						id: 'field-email',
						name: 'email',
						label: 'Email',
						type: 'email',
						placeholder: 'jane@example.com',
						required: true
					},
					{
						id: 'field-message',
						name: 'message',
						label: 'Message',
						type: 'textarea',
						placeholder: 'How can we help?',
						required: false
					}
				]
			}
		}
	]
});
