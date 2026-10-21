#!/usr/bin/env bun
/**
 * Test script to verify Directus user sync functionality
 * Tests the complete flow of user synchronization between Better Auth and Directus
 */

import { initializeCMS } from '../src/lib/server/cms';
import { logger } from '../src/lib/shared/logger';
import { getServerEnv } from '../src/lib/auth/shared/env';
import type { BetterAuthUser } from '../src/lib/server/database/types';
import type { DirectusCMSProvider } from '../src/lib/server/cms/providers/directus/types';

// Test user data
const testUser: BetterAuthUser = {
	id: 'test-user-' + Date.now(),
	email: `test-${Date.now()}@example.com`,
	name: 'Test User',
	emailVerified: true,
	image: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString()
};

async function testUserSync() {
	logger.info('🚀 Starting Directus user sync test...');

	try {
		// Initialize CMS provider
		const env = await getServerEnv();
		if (!env.PUBLIC_CMS_URL || !env.DIRECTUS_ADMIN_TOKEN) {
			logger.error('❌ Missing required environment variables');
			logger.error('Required: PUBLIC_CMS_URL, DIRECTUS_ADMIN_TOKEN');
			process.exit(1);
		}

		logger.info('📦 Initializing Directus CMS provider...');
		const cmsProvider = initializeCMS({
			provider: 'directus',
			url: env.PUBLIC_CMS_URL,
			apiToken: env.DIRECTUS_ADMIN_TOKEN,
			providerSpecificConfig: {
				defaultRoleId: env.DIRECTUS_DEFAULT_ROLE_ID,
				rateLimit: {
					intervalCap: 10,
					interval: 1000
				}
			}
		}) as DirectusCMSProvider;

		logger.info('✅ CMS provider initialized');

		// Test 1: Health check
		logger.info('🏥 Testing health check...');
		const isHealthy = await cmsProvider.healthCheck();
		if (!isHealthy) {
			logger.error('❌ Health check failed');
			process.exit(1);
		}
		logger.info('✅ Health check passed');

		// Test 2: Create user
		logger.info('👤 Testing user creation...');
		const syncedUser = await cmsProvider.userSyncService?.syncUser(testUser);
		if (!syncedUser) {
			logger.error('❌ User sync failed');
			process.exit(1);
		}
		logger.info('✅ User created in Directus', {
			userId: syncedUser.id,
			email: syncedUser.email
		});

		// Test 3: Find user by email
		logger.info('🔍 Testing user lookup by email...');
		const foundUser = await cmsProvider.userSyncService?.findUser({
			email: testUser.email
		});
		if (!foundUser) {
			logger.error('❌ User lookup by email failed');
			process.exit(1);
		}
		logger.info('✅ User found by email', {
			userId: foundUser.id,
			email: foundUser.email
		});

		// Test 4: Find user by ID
		logger.info('🔍 Testing user lookup by ID...');
		const foundUserById = await cmsProvider.userSyncService?.findUser({
			id: syncedUser.id
		});
		if (!foundUserById) {
			logger.error('❌ User lookup by ID failed');
			process.exit(1);
		}
		logger.info('✅ User found by ID', {
			userId: foundUserById.id,
			email: foundUserById.email
		});

		// Test 5: Get user via CMS interface
		logger.info('🔍 Testing getUser via CMS interface...');
		const cmsUser = await cmsProvider.getUser(syncedUser.id);
		if (!cmsUser) {
			logger.error('❌ CMS getUser failed');
			process.exit(1);
		}
		logger.info('✅ CMS getUser successful', {
			userId: cmsUser.id,
			email: cmsUser.email,
			name: cmsUser.name
		});

		// Test 6: Update user
		logger.info('📝 Testing user update...');
		const updatedTestUser: BetterAuthUser = {
			...testUser,
			name: 'Updated Test User'
		};
		const updatedUser = await cmsProvider.userSyncService?.syncUser(updatedTestUser);
		if (!updatedUser || updatedUser.first_name !== 'Updated') {
			logger.error('❌ User update failed');
			process.exit(1);
		}
		logger.info('✅ User updated successfully', {
			firstName: updatedUser.first_name,
			lastName: updatedUser.last_name
		});

		// Test 7: List users (optional)
		logger.info('📋 Testing user listing...');
		try {
			const users = await cmsProvider.listUsers?.({ limit: 5 });
			if (users && Array.isArray(users)) {
				logger.info('✅ User listing successful', {
					count: users.length,
					hasTestUser: users.some((u) => u.id === syncedUser.id)
				});
			} else {
				logger.info('ℹ️ User listing not available');
			}
		} catch (listError) {
			logger.info('ℹ️ User listing failed (non-critical)', { error: listError });
		}

		// Test 8: Cleanup - delete test user
		logger.info('🧹 Cleaning up test user...');
		try {
			// Delete the user from Directus
			await cmsProvider.userSyncService?.deleteUser?.(syncedUser.id);
			logger.info('✅ Test user deleted from Directus');
		} catch (cleanupError) {
			logger.warn('⚠️ Could not delete test user', { error: cleanupError });
		}

		logger.info('🎉 All tests passed! Directus user sync is working correctly.');

		// Cleanup resources
		try {
			await cmsProvider.destroy?.();
			logger.info('🧹 Resources cleaned up');
		} catch (cleanupError) {
			logger.error('❌ Could not cleanup resources', { error: cleanupError });
		}
	} catch (error) {
		logger.error('💥 Test failed:', error);
		process.exit(1);
	}
}

// Run the test
testUserSync().catch((error) => {
	logger.error('💥 Unhandled error:', error);
	process.exit(1);
});
