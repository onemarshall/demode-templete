import { PageBuilderModelSchema, type PageBuilderModel } from '$lib/content/schema';

export const welcomePage: PageBuilderModel = PageBuilderModelSchema.parse({
	path: '/about-the-centre/welcome',
	title: 'Welcome',
	blocks: [
		{
			id: 'hero-welcome-001',
			collection: 'block_hero',
			sort: 1,
			background: 'light',
			item: {
				id: 'hero-item-welcome-001',
				title: 'Welcome',
				headline: 'Welcome to our centre',
				description:
					'Welcome to our centre. We are dedicated to providing the best services to our clients.',
				layout: 'left',
				alignment: 'left',
				image: '',
				button_group: {
					id: 'hero-button-group-001',
					buttons: [
						{
							id: 'hero-button-001',
							label: 'Learn More',
							variant: 'primary',
							url: '/about/our-story',
							type: 'page'
						},
						{
							id: 'hero-button-002',
							label: 'Contact Us',
							variant: 'secondary',
							url: '/contact',
							type: 'page'
						}
					]
				}
			}
		}
	]
});
