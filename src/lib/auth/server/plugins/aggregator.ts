/**
 * Plugin Aggregator
 *
 * Combines all plugin types into a single plugin array.
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '#lib/auth/shared/env/index.js';
import { buildCorePlugins } from './core';
import { buildSecurityPlugins } from './security';
import { buildCMSPlugin } from './cms';

interface BuildPluginsOptions {
	cli?: boolean;
}

/**
 * Build all plugins for the auth instance
 *
 * Note: This is async because CMS plugin initialization is async
 */
export async function buildPlugins(
	env: FullEnv,
	options: BuildPluginsOptions = {}
): Promise<BetterAuthPlugin[]> {
	const plugins: BetterAuthPlugin[] = [];

	// Add core plugins (sync)
	plugins.push(...buildCorePlugins(env));

	// Add security plugins (sync)
	plugins.push(...buildSecurityPlugins(env));

	// Add CMS plugin (async)
	const cmsPlugin = await buildCMSPlugin(env, options);
	if (cmsPlugin) {
		plugins.push(cmsPlugin);
	}

	return plugins;
}

/**
 * Build only synchronous plugins (for cases where async isn't possible)
 */
export function buildSyncPlugins(env: FullEnv): BetterAuthPlugin[] {
	const plugins: BetterAuthPlugin[] = [];

	plugins.push(...buildCorePlugins(env));
	plugins.push(...buildSecurityPlugins(env));

	return plugins;
}
