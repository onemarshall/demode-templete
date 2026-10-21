/**
 * CMS Provider Factory
 * Creates and manages CMS provider instances
 */

import type { CMSProvider, CMSConfig, CMSProviderType } from './types';
import { DirectusCMSProvider } from './providers/directus/index';
import { StrapiCMSProvider } from './providers/strapi';
import { PayloadCMSProvider } from './providers/payload';
import { TempleCMSProvider } from './providers/temple';
import { createProviderLogger } from '#lib/auth/shared/logger.js';

let cmsInstance: CMSProvider | null = null;

export class UnsupportedCMSProviderError extends Error {
	readonly provider: CMSProviderType;
	constructor(provider: CMSProviderType) {
		super(buildUnsupportedProviderMessage(provider));
		this.name = 'UnsupportedCMSProviderError';
		this.provider = provider;
		Object.defineProperty(this, 'stack', {
			value: `${this.name}: ${this.message}`,
			configurable: true,
			enumerable: false,
			writable: true
		});
	}
}

/**
 * Create a CMS provider instance based on configuration
 */
export function createCMSProvider(config: CMSConfig): CMSProvider {
	const cmsLogger = createProviderLogger('CMS', config.provider);

	cmsLogger.start('CMS creation started...');

	switch (config.provider) {
		case 'directus':
			cmsLogger.start('Directus CMS provider creation started...');
			return new DirectusCMSProvider(config);
		case 'strapi':
			cmsLogger.start('Strapi CMS provider creation started...');
			return new StrapiCMSProvider(config);
		case 'payload':
			cmsLogger.start('Payload CMS provider creation started...');
			return new PayloadCMSProvider(config);
		case 'sanity':
			cmsLogger.warn('Sanity CMS provider not yet supported');
			throw new UnsupportedCMSProviderError(config.provider);
		case 'temple':
			cmsLogger.start('Temple CMS provider creation started...');
			return new TempleCMSProvider(config);
		default: {
			const _exhaustive: never = config.provider;
			cmsLogger.error('Factory creation failed - unknown provider', { provider: _exhaustive });
			throw new Error(`Unknown CMS provider: ${_exhaustive}`);
		}
	}
}

function buildUnsupportedProviderMessage(provider: CMSProviderType): string {
	return [
		`CMS provider "${provider}" is not available in this project.`,
		'Currently supported providers: directus, strapi, payload, temple.',
		'Set CMS_PROVIDER to a supported provider or add an implementation before enabling it.'
	].join(' ');
}

/**
 * Get or create the global CMS provider instance
 */
export function getCMSProvider(config?: CMSConfig): CMSProvider {
	if (!cmsInstance) {
		if (!config) {
			throw new Error('CMS provider not initialized. Call getCMSProvider with config first.');
		}
		cmsInstance = createCMSProvider(config);
	}
	return cmsInstance;
}

/**
 * Initialize the global CMS provider
 */
export function initializeCMS(config: CMSConfig): CMSProvider {
	const cmsLogger = createProviderLogger('CMS', config.provider);
	cmsInstance = createCMSProvider(config);
	cmsLogger.success('Initialization completed');
	return cmsInstance;
}

/**
 * Reset the CMS provider (useful for testing)
 */
export function resetCMS(): void {
	cmsInstance = null;
	createProviderLogger('CMS').info('Provider reset');
}

// Re-export shared types
export type { CMSProvider, CMSConfig, CMSProviderType, CMSUser, CMSFile } from './types';
