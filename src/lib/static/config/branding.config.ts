/**
 * Brand Configuration
 * CSS class definitions for brand-specific typography and sections
 *
 * @module config/branding.config
 * @description Predefined CSS class strings for consistent brand typography across the application
 *
 * @example
 * import { brandConfig } from '$config';
 *
 * // Use in Svelte templates
 * <h1 class={brandConfig.intro}>Welcome</h1>
 * <h2 class={brandConfig.title}>Subtitle</h2>
 * <section class={brandConfig.section}>Content</section>
 */

export const brandConfig = {
	/**
	 * Intro/Hero title styling
	 * @type {string}
	 * @description Large, uppercase title with bottom border for hero sections
	 */
	intro:
		'text-title text-2xl text-5xl@xs text-5xl@xl text-uppercase z-index-1 color-contrast-higher border-bottom border-3 border-contrast-medium padding-bottom-sm',

	/**
	 * Standard title styling
	 * @type {string}
	 * @description Medium, uppercase title with extralight font weight
	 */
	title:
		'font-extralight text-title text-xl text-2xl@xs text-2xl@xl text-uppercase z-index-1 color-contrast-higher  padding-bottom-sm',

	/**
	 * Section heading styling
	 * @type {string}
	 * @description Section header with bottom border, responsive sizing
	 */
	section:
		'text-title text-xl text-2xl@sm text-2xl@xl text-uppercase z-index-1 color-contrast-higher border-bottom border-3 border-contrast-medium padding-bottom-md'
};

export default brandConfig;
