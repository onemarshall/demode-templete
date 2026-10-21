/**
 * CMS Integration Plugins
 *
 * Plugins for integrating with various CMS systems.
 */

import type { FullEnv } from '$lib/auth/shared/env';
import type { BetterAuthPlugin } from 'better-auth';
import type { CMSProvider, CMSProviderType, CMSConfig } from '$lib/auth/server/cms/types';
import type { DirectusCMSProvider } from '$lib/auth/server/cms/providers/directus';
import { logger } from '$lib/auth/shared/logger';

// Global CMS provider instance
let cmsProvider: CMSProvider | null = null;

interface CMSPluginOptions {
	cli?: boolean;
}

/**
 * Build CMS plugin for user synchronization with configured provider
 */
export async function buildCMSPlugin(
	env: FullEnv,
	{ cli = false }: CMSPluginOptions = {}
): Promise<BetterAuthPlugin | null> {
	const cmsProviderType =
		typeof env.CMS_PROVIDER === 'string' && env.CMS_PROVIDER.length > 0 ? env.CMS_PROVIDER : 'none';

	if (cmsProviderType === 'none') {
		logger.debug('CMS provider not configured, skipping plugin');
		return null;
	}

	const requiredVars = getRequiredEnvVars(cmsProviderType);
	const missingVars = requiredVars.filter(
		(varName) => typeof env[varName as keyof FullEnv] !== 'string'
	);

	if (missingVars.length > 0) {
		logger.warn(
			`CMS provider ${cmsProviderType} not fully configured. Missing: ${missingVars.join(', ')}`
		);
		return null;
	}

	const { initializeCMS } = await import('$lib/auth/server/cms');

	try {
		const config = buildCMSConfig(env, cmsProviderType);
		cmsProvider = initializeCMS(config);

		logger.info(`CMS plugin initialized with provider: ${cmsProviderType}`);

		let plugin: BetterAuthPlugin;

		switch (cmsProviderType) {
			case 'directus': {
				const { directusSyncPlugin } = await import('$lib/auth/server/cms/providers/directus');
				const directusProvider = cmsProvider as DirectusCMSProvider;
				plugin = directusSyncPlugin({ client: directusProvider.syncClient });
				break;
			}
			case 'strapi':
			case 'payload':
			default:
				logger.warn(`No auth plugin available for ${cmsProviderType}, using basic plugin`);
				plugin = {
					id: `${cmsProviderType}-cms`,
					init: async () => {
						logger.info(`${cmsProviderType} CMS plugin initialized`);
					}
				};
		}

		if (!cli) {
			logger.info(`${cmsProviderType} CMS plugin initialized successfully`);
		}

		return plugin;
	} catch (error) {
		logger.error(`Failed to initialize ${cmsProviderType} CMS provider:`, error);
		return null;
	}
}

/**
 * Get required environment variables for each CMS provider
 */
function getRequiredEnvVars(provider: string): string[] {
	switch (provider) {
		case 'directus':
			return ['PUBLIC_CMS_URL', 'DIRECTUS_ADMIN_TOKEN'];
		case 'strapi':
			return ['PUBLIC_CMS_URL', 'STRAPI_API_TOKEN'];
		case 'payload':
			return ['PUBLIC_CMS_URL', 'PAYLOAD_API_TOKEN'];
		case 'sanity':
			return ['PUBLIC_CMS_URL', 'SANITY_API_TOKEN', 'SANITY_PROJECT_ID'];
		default:
			return ['PUBLIC_CMS_URL'];
	}
}

/**
 * Build CMS configuration based on provider type
 */
function buildCMSConfig(env: FullEnv, provider: string): CMSConfig {
	const cmsUrl = typeof env.PUBLIC_CMS_URL === 'string' ? env.PUBLIC_CMS_URL : '';
	const baseConfig: CMSConfig = {
		provider: provider as CMSProviderType,
		url: cmsUrl,
		apiToken: getApiToken(env, provider)
	};

	switch (provider) {
		case 'directus':
			return {
				...baseConfig,
				providerSpecificConfig: {
					defaultRoleId: env.DIRECTUS_DEFAULT_ROLE_ID,
					rateLimit: { intervalCap: 10, interval: 1000 }
				}
			};
		case 'strapi':
			return {
				...baseConfig,
				providerSpecificConfig: { apiVersion: env.STRAPI_API_VERSION || 'v5' }
			};
		case 'payload':
			return {
				...baseConfig,
				providerSpecificConfig: {
					usersCollection: env.PAYLOAD_USERS_COLLECTION || 'users',
					mediaCollection: env.PAYLOAD_MEDIA_COLLECTION || 'media',
					avatarField: env.PAYLOAD_AVATAR_FIELD || 'avatar'
				}
			};
		case 'sanity':
			return {
				...baseConfig,
				providerSpecificConfig: {
					projectId: env.SANITY_PROJECT_ID!,
					dataset: env.SANITY_DATASET || 'production',
					apiVersion: env.SANITY_API_VERSION || '2023-06-21'
				}
			};
		default:
			return baseConfig;
	}
}

/**
 * Get the appropriate API token for the provider
 */
function getApiToken(env: FullEnv, provider: string): string {
	switch (provider) {
		case 'directus':
			return typeof env.DIRECTUS_ADMIN_TOKEN === 'string' ? env.DIRECTUS_ADMIN_TOKEN : '';
		case 'strapi':
			return typeof env.STRAPI_API_TOKEN === 'string' ? env.STRAPI_API_TOKEN : '';
		case 'payload':
			return typeof env.PAYLOAD_API_TOKEN === 'string' ? env.PAYLOAD_API_TOKEN : '';
		case 'sanity':
			return typeof env.SANITY_API_TOKEN === 'string' ? env.SANITY_API_TOKEN : '';
		default:
			return '';
	}
}

/**
 * Get the generic CMS provider instance
 */
export function getCMSProvider(): CMSProvider | null {
	return cmsProvider;
}

/**
 * Get the Directus CMS provider instance (type-safe)
 * Returns null if provider is not Directus or not initialized
 */
export function getDirectusCMSProvider(): DirectusCMSProvider | null {
	if (!cmsProvider) return null;

	// Check if it's actually a Directus provider
	if ('syncUser' in cmsProvider && 'updateUserAvatar' in cmsProvider) {
		return cmsProvider as DirectusCMSProvider;
	}

	return null;
}

// Alias for backwards compatibility
export const getDirectusPlugin = getDirectusCMSProvider;
