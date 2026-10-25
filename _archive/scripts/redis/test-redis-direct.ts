import { createClient } from 'redis';

async function testRedisConnection() {
	// Get Redis connection details from environment variables
	const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
	const redisPassword = process.env.REDIS_PASSWORD;
	const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

	console.log(`Connecting to Redis at ${redisUrl} (DB: ${redisDb})`);

	const client = createClient({
		url: redisUrl,
		password: redisPassword,
		database: redisDb,
		socket: {
			reconnectStrategy: (retries) => {
				console.log(`Redis reconnecting attempt ${retries}`);
				if (retries > 5) {
					console.error('Max reconnection attempts reached');
					return new Error('Max reconnection attempts reached');
				}
				return Math.min(retries * 100, 5000); // Reconnect with backoff
			}
		}
	});

	client.on('connect', () => console.log('Redis connect event'));
	client.on('ready', () => console.log('Redis ready event'));
	client.on('error', (err) => console.error('Redis error:', err));
	client.on('reconnecting', () => console.log('Redis reconnecting...'));
	client.on('end', () => console.log('Redis connection closed'));

	try {
		// Connect to Redis
		await client.connect();
		console.log('✅ Successfully connected to Redis');

		// Test basic key-value operations
		const testKey = 'test:key';
		await client.set(testKey, 'test-value');
		const value = await client.get(testKey);
		console.log(`✅ Basic get/set test: ${value === 'test-value' ? 'PASSED' : 'FAILED'}`);

		// Test Sorted Set operations
		const testSortedSet = 'test:sorted:set';
		const now = Date.now();

		// Add some test data
		await client.zAdd(testSortedSet, [
			{ score: now - 10000, value: 'old' },
			{ score: now - 5000, value: 'recent' },
			{ score: now, value: 'now' }
		]);

		// Test zCard
		const count = await client.zCard(testSortedSet);
		console.log(`✅ Sorted Set count: ${count} (expected: 3)`);

		// Test zRemRangeByScore
		const removed = await client.zRemRangeByScore(testSortedSet, 0, now - 6000);
		console.log(`✅ Removed ${removed} old items`);

		// Verify remaining items
		const remaining = await client.zCard(testSortedSet);
		console.log(`✅ Remaining items: ${remaining} (expected: 2)`);

		// Clean up
		await client.del(testKey);
		await client.del(testSortedSet);
	} catch (error) {
		console.error('❌ Redis test failed:', error);
		process.exit(1);
	} finally {
		await client.quit();
		console.log('✅ Redis connection closed');
	}
}

testRedisConnection().catch(console.error);
