declare module 'sveltekit-autoimport' {
	interface AutoImportOptions {
		/**
		 * Components to auto-import
		 */
		components?: Record<string, string> | string[]
		/**
		 * Functions to auto-import
		 */
		functions?: Record<string, string>
		/**
		 * Modules to auto-import from
		 */
		modules?: Record<string, string>
		/**
		 * Whether to auto-import SvelteKit functions
		 */
		kit?: boolean
	}

	type VitePlugin = {
		name: string
		configureServer?: (server: unknown) => void
		transform?: (code: string, id: string) => { code: string } | null
	}

	interface AutoImportPlugin {
		(options: AutoImportOptions): VitePlugin
	}

	const autoImport: AutoImportPlugin
	export default autoImport
}
