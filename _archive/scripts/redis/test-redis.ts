import { createManagedRedisClient } from '#lib/server/auth/security/utils';
import { logger } from '#lib/shared/logger';

async function testRedisConnection() {
	const redis = createManagedRedisClient('test-client');

	try {
		// Test basic connection
		await redis.ensureConnected();
		logger.info('✅ Successfully connected to Redis');

		// Test basic key-value operations
		const testKey = 'test:key';
		await redis.set(testKey, 'test-value');
		const value = await redis.get(testKey);
		logger.info(`✅ Basic get/set test: ${value === 'test-value' ? 'PASSED' : 'FAILED'}`);

		// Test Sorted Set operations
		const testSortedSet = 'test:sorted:set';
		const now = Date.now();

		// Add some test data
		await redis.zAdd(testSortedSet, { score: now - 10000, value: 'old' });
		await redis.zAdd(testSortedSet, { score: now - 5000, value: 'recent' });
		await redis.zAdd(testSortedSet, { score: now, value: 'now' });

		// Test zCard
		const count = await redis.zCard(testSortedSet);
		logger.info(`✅ Sorted Set count: ${count} (expected: 3)`);

		// Test zRemRangeByScore
		const removed = await redis.zRemRangeByScore(testSortedSet, 0, now - 6000);
		logger.info(`✅ Removed ${removed} old items`);

		// Verify remaining items
		const remaining = await redis.zCard(testSortedSet);
		logger.info(`✅ Remaining items: ${remaining} (expected: 2)`);

		// Clean up
		await redis.del(testKey, testSortedSet);
	} catch (error) {
		logger.error('❌ Redis test failed:', error);
	} finally {
		await redis.disconnect();
	}
}

testRedisConnection().catch((error) => {
	logger.error('Unhandled error in Redis test:', error);
	process.exit(1);
});
