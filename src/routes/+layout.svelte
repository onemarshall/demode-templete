<script lang="ts">
	import '../app.css';
	import { dev } from '$app/env';
	import { onMount, onDestroy } from 'svelte';
	import { publicEnv, isDevelopment } from '#lib/auth/shared/env/index.js';
	import { Toaster } from 'svelte-sonner';
	import { ModeWatcher } from "mode-watcher";
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet; data: LayoutData } = $props();

	// ============================================
	// Security Configuration
	// ============================================

	const isEnabled = (key: string): boolean => {
		const value = publicEnv[key as keyof typeof publicEnv];
		if (typeof value === 'boolean') return value;
		if (typeof value === 'string') return value.toLowerCase() === 'true';
		return false;
	};

	const forceAllSecurity = isEnabled('PUBLIC_ALL_SECURITY');
	const disableInDev = dev && !forceAllSecurity;

	const shouldEnable = (key: string, defaultValue = true): boolean => {
		const explicit = isEnabled(key);
		if (publicEnv[key as keyof typeof publicEnv] !== undefined) {
			return explicit;
		}
		if (forceAllSecurity) return true;
		if (disableInDev) return false;
		return defaultValue;
	};

	const securityConfig = {
		fraudDetection: shouldEnable('PUBLIC_AUTH_FRAUD_DETECTION_PLUGIN'),
		abuseProtection: shouldEnable('PUBLIC_AUTH_ABUSE_PROTECTION_PLUGIN'),
		geoProtection: shouldEnable('PUBLIC_AUTH_GEO_INTELLIGENCE_PLUGIN'),
		rateLimit: shouldEnable('PUBLIC_AUTH_RATE_LIMIT_PLUGIN'),
		securityAnalytics: shouldEnable('PUBLIC_AUTH_SECURITY_ANALYTICS_PLUGIN')
	};

	// ============================================
	// Initialization
	// ============================================

	let cleanup: (() => void) | null = null;

	onMount(() => {
		// Fire and forget the async init, store cleanup reference
		import('#lib/auth-client.js').then(async ({ initializeAuth, cleanupAuth }) => {
			await initializeAuth();
			cleanup = cleanupAuth;
		});
	});

	onDestroy(() => {
		cleanup?.();
	});
</script>
<ModeWatcher />
<Toaster richColors position="top-right" />
{@render children()}

{#if isDevelopment()}
	<div
		class="fixed right-2 bottom-2 z-50 rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs text-yellow-800"
	>
		🚧 {publicEnv.PUBLIC_APP_NAME} - Development Mode
	</div>
{/if}
