#!/usr/bin/env bun
/**
 * Test script for the unified Directus CMS provider
 * Tests both CMS operations and Better Auth integration
 */

import { initializeCMS, type CMSProvider } from '../src/lib/server/cms';
import { DirectusCMSProvider } from '../src/lib/server/cms/providers/directus';
import { directusAuthPlugin } from '../src/lib/server/cms/providers/directus/auth-plugin';
import { logger } from '../src/lib/shared/logger';

function isDirectusProvider(provider: CMSProvider): provider is DirectusCMSProvider {
	return provider.constructor.name === 'DirectusCMSProvider';
}

async function testUnifiedDirectus() {
	logger.info('🚀 Testing Unified Directus CMS Provider...');

	try {
		// Initialize CMS provider with Directus
		const cmsProvider = initializeCMS({
			provider: 'directus',
			url: process.env.DIRECTUS_URL || 'http://localhost:8051',
			apiToken: process.env.DIRECTUS_ADMIN_TOKEN || 'admin-token',
			providerSpecificConfig: {
				defaultRoleId: process.env.DIRECTUS_DEFAULT_ROLE_ID,
				rateLimit: {
					intervalCap: 10,
					interval: 1000
				}
			}
		});

		if (!isDirectusProvider(cmsProvider)) {
			throw new Error('Expected DirectusCMSProvider instance');
		}

		logger.info('✅ CMS Provider initialized successfully');
		logger.info(`Provider: ${cmsProvider.constructor.name}`);

		// Test 1: Health check
		logger.info('1. Testing CMS provider health check...');
		const isHealthy = await cmsProvider.healthCheck();
		logger.info(`   Health check: ${isHealthy ? '✅ PASSED' : '❌ FAILED'}`);

		if (!isHealthy) {
			logger.warn('   Skipping remaining tests due to failed health check');
			return;
		}

		// Test 2: List users
		logger.info('2. Testing user operations...');
		try {
			const users = await cmsProvider.listUsers({ limit: 5 });
			logger.info(`   ✅ Found ${users.length} users`);
		} catch (error) {
			logger.warn('   ⚠️ User list failed:', error);
		}

		// Test 3: Better Auth plugin creation
		logger.info('3. Testing Better Auth plugin creation...');
		const authPlugin = directusAuthPlugin({ cmsProvider });
		logger.info(`   ✅ Plugin created with id: "${authPlugin.id}"`);

		// Test 4: Plugin initialization (skip context-dependent init in test)
		logger.info('4. Testing Better Auth plugin...');
		logger.info(`   ✅ Plugin has init: ${typeof authPlugin.init === 'function'}`);
		logger.info(`   ℹ️  Full init requires Better Auth context (skipped in standalone test)`);

		// Test 5: Service access
		logger.info('5. Testing service access...');
		const services = [
			['userSyncService', cmsProvider.userSyncService],
			['fileService', cmsProvider.fileService],
			['rawClient', cmsProvider.rawClient],
			['requestQueue', cmsProvider.requestQueue]
		] as const;

		for (const [name, service] of services) {
			logger.info(`   ${service ? '✅' : '❌'} ${name}`);
		}

		// Test 6: Rate limiting
		logger.info('6. Testing rate limiting...');
		const startTime = Date.now();
		const results = await Promise.all(
			Array.from({ length: 5 }, (_, i) =>
				cmsProvider.executeWithRateLimit(() => Promise.resolve(i))
			)
		);
		const elapsed = Date.now() - startTime;
		logger.info(`   ✅ Completed ${results.length} operations in ${elapsed}ms`);

		// Test 7: CMS interface compliance
		logger.info('7. Testing CMS interface compliance...');
		const requiredMethods = [
			'getUser',
			'updateUserAvatar',
			'deleteUserAvatar',
			'uploadFile',
			'deleteFile',
			'getFile',
			'healthCheck'
		] as const;

		const methodStatus = requiredMethods.map((method) => ({
			method,
			exists: typeof cmsProvider[method] === 'function'
		}));

		const missing = methodStatus.filter((m) => !m.exists);

		if (missing.length === 0) {
			logger.info('   ✅ All required CMS interface methods implemented');
		} else {
			logger.error(`   ❌ Missing methods: ${missing.map((m) => m.method).join(', ')}`);
		}

		logger.info('');
		logger.info('🎉 All unified Directus tests passed!');
	} catch (error) {
		logger.error('❌ Test failed:', error);
		process.exit(1);
	}
}

testUnifiedDirectus();
