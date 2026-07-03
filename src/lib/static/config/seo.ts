/**
 * SEO Configuration
 * SEO metadata for different pages
 *
 * @module config/seo
 * @description SEO metadata including titles, descriptions, and Open Graph data
 */

export const seo = {
	// Default SEO settings
	default: {
		title: 'Oxford Centre for Animal Ethics',
		description:
			'The Oxford Centre for Animal Ethics is a world-leading centre for the promotion of animal ethics.',
		ogTitle: 'Oxford Centre for Animal Ethics',
		ogDescription: 'A world-leading centre for the promotion of animal ethics and animal welfare.',
		ogImgTitle: 'Oxford Centre for Animal Ethics',
		ogImgSubtext: 'Promoting Animal Ethics',
		ogImgAlt: 'Oxford Centre for Animal Ethics Logo'
	},

	// Page-specific SEO settings
	home: {
		title: 'Home',
		description:
			'Welcome to the Oxford Centre for Animal Ethics - a world-leading centre for the promotion of animal ethics.',
		ogTitle: 'Oxford Centre for Animal Ethics - Home',
		ogDescription:
			'Welcome to the Oxford Centre for Animal Ethics - a world-leading centre for the promotion of animal ethics.',
		ogImgTitle: 'Home - Oxford Centre for Animal Ethics',
		ogImgSubtext: 'Promoting Animal Ethics',
		ogImgAlt: 'Oxford Centre for Animal Ethics Home'
	},

	about: {
		title: 'About Us',
		description:
			'Learn about the Oxford Centre for Animal Ethics and our mission to promote animal ethics.',
		ogTitle: 'About - Oxford Centre for Animal Ethics',
		ogDescription:
			'Learn about the Oxford Centre for Animal Ethics and our mission to promote animal ethics.',
		ogImgTitle: 'About Us - Oxford Centre for Animal Ethics',
		ogImgSubtext: 'Our Mission',
		ogImgAlt: 'About Oxford Centre for Animal Ethics'
	},

	configs: {
		title: 'Configuration',
		description: 'Configure settings for the Oxford Centre for Animal Ethics website.',
		ogTitle: 'Configuration - Oxford Centre for Animal Ethics',
		ogDescription: 'Configure settings for the Oxford Centre for Animal Ethics website.',
		ogImgTitle: 'Configuration - Oxford Centre for Animal Ethics',
		ogImgSubtext: 'Site Settings',
		ogImgAlt: 'Configuration Oxford Centre for Animal Ethics'
	}
};

export default seo;
