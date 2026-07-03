/**
 * Application Configuration
 * Global app settings, site metadata, and navigation structure
 *
 * @module config/app.config
 * @description Core application settings including site information, contact details, and navigation
 *
 * @example
 * import { appConfig } from '$config';
 * console.log(appConfig.name); // 'Oxford Centre for Animal Ethics'
 * console.log(appConfig.contact.email); // 'info@designinc.com'
 */

export const appConfig = {
	// Site Metadata
	title: 'Example',
	domain: 'Example',
	logo: 'logo.png',
	logoDark: 'logo-dark.png',
	url: 'https://example.com',
	// Designed By
	designBy: 'Designed by',
	designbyName: 'Demo Design',
	designbyURL: 'https://demodesign.com',
	// Copyright
	copyright: 'Austin Marshall Design',
	description: 'Advancing animal ethics through pioneering research, education, and advocacy.',

	// SEO & Analytics
	analyticsId: 'UA-123456789-1',
	googleSearchConsole: 'google-site-verification=1234567890',

	// Business/Organization
	company: 'Example Company Ltd',
	businessType: 'nonprofit',
	vatNumber: '',
	registrationNumber: '',

	// Technical
	environment: 'development',
	apiUrl: 'http://localhost:5173/api',
	cdnUrl: '',
	timezone: 'Europe/London',

	// Legal
	gdprCompliant: true,

	// Content
	defaultLocale: 'en-GB',
	supportedLocales: ['en-GB'],
	contentType: 'corporate',
	maintenanceMode: false,

	// Contact Information
	address: {
		road: '66 Sample Road',
		city: 'Sample City',
		county: 'Sample County',
		postcode: 'DA11 1TA',
		country: 'United Kingdom'
	},
	contact: {
		phone: '+44 07872 32452345',
		email: 'info@designinc.com'
	},

	// Social Media Configuration
	socialMedia: {
		style: '1',
		theme: 'dark'
	},
	// Social Media Links
	socials: {
		linkedin: 'https://linkedin.com/demosite',
		twitter: 'https://twitter.com/demosite',
		pinterest: 'https://pinterest.com/demosite',
		facebook: 'https://facebook.com/demosite',
		instagram: 'https://instagram.com/demosite',
		youtube: 'https://youtube.com/demosite'
	},
	// Do not add any additional settings below this line for Directus
	// Navigation Structure
	navigation: {
		infoItems: ['about', 'who-we-are', 'summer-school'],
		whatItems: ['research-focus', 'ethics-topics', 'what-we-offer', 'outputs'],
		supportItems: ['support-us', 'more-ways'],
		footerItems: ['about', 'who-we-are', 'research-focus', 'summer-school']
	},

	// Global Settings
	license: 'MIT',
	licenselink: 'https://github.com/yourname/yourtheme/blob/master/LICENSE',
	author: {
		name: 'Sam Water',
		homepage: 'https://demodesign.com'
	},
	version: '0.1'
};

export default appConfig;
