/**
 * Theme Configuration
 * Visual design settings including fonts, colors, UI components, and animations
 *
 * @module config/theme.config
 * @description Theme and visual design configuration for the entire application
 *
 * @example
 * import { themeConfig } from '$config';
 * console.log(themeConfig.navbar); // 'Mega'
 * console.log(themeConfig.fonts.primary); // 'Darkmode On'
 * console.log(themeConfig.animation); // 'true'
 */

export const themeConfig = {
	// Visual Brand Elements
	brandColors: {
		primary: '#000000',
		secondary: '#ffffff',
		accent: '#007acc'
	},

	// Typography
	font: 'FontSetV1', //'FontSetV2','FontSetV3', 'FontSetV4', 'FontSetV5'
	fonts: {
		primary: 'Darkmode On',
		secondary: 'Bodoni Moda'
	},

	// UI Components
	navbar: 'Mega', // Navbar style - Options: Mega, Flex, Morphing, Floating, Draw, Header, Basic
	folder: 'default',
	imagefolder: 'placeholder',

	// Footer Configuration
	footer: {
		theme: 'primary',
		style: 'f9', //'f1','f2','f3','f4','f5','f6','f7','f8','f9','f10'
		menuNames: ['about', 'who-we-are', 'research-focus']
	},

	// Effects and Animations
	animation: 'true',

	fx: {
		split: 'chars', // 'chars' 'lines'
		splitLine: 'lines', // 'chars' 'lines'
		style: 'FxType1' // 'FxType1' 'FxType2' 'FxType3' 'FxType5' 'FxType6' 'FxType7' 'FxType8'
	}
};

export default themeConfig;
