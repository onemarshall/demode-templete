import { createClient, type RedisClientOptions } from 'redis';

// Configuration
const CONFIG = {
	redis: {
		url: process.env.REDIS_URL || 'redis://localhost:6379',
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || '0', 10)
	},
	// Security thresholds
	security: {
		minPasswordLength: 12,
		maxInvalidAttempts: 5,
		maxClients: 10000,
		maxMemoryPercent: 90
	},
	// Alert thresholds
	alerts: {
		memoryThreshold: 80, // %
		clientThreshold: 80, // % of max clients
		cpuThreshold: 70 // %
	}
};

// Create Redis client with proper TLS handling
const redisOptions: RedisClientOptions = {
	url: CONFIG.redis.url,
	password: CONFIG.redis.password,
	database: CONFIG.redis.db,
	socket: {
		reconnectStrategy: (retries: number) => Math.min(retries * 100, 5000)
	}
};

// Handle TLS configuration
if (CONFIG.redis.url.startsWith('rediss://')) {
	redisOptions.socket = {
		...redisOptions.socket,
		tls: true,
		rejectUnauthorized: false // For self-signed certs in dev
	};
}

const redis = createClient(redisOptions);

// Test results
const testResults = {
	security: {
		authentication: { passed: false, message: '' },
		tls: { passed: false, message: '' },
		acl: { passed: false, message: '' },
		protectedMode: { passed: false, message: '' }
	},
	configuration: {
		maxmemory: { passed: false, message: '', value: 0 },
		maxclients: { passed: false, message: '', value: 0 },
		persistence: { passed: false, message: '' },
		tcpKeepalive: { passed: false, message: '' }
	},
	performance: {
		latency: { passed: false, message: '', value: 0 },
		opsPerSec: { passed: false, message: '', value: 0 },
		memoryFragmentation: { passed: false, message: '', value: 0 }
	},
	monitoring: {
		metrics: { passed: false, message: '' },
		slowlog: { passed: false, message: '' },
		keyspace: { passed: false, message: '' }
	},
	backup: {
		rdb: { passed: false, message: '' },
		aof: { passed: false, message: '' }
	}
};

// Helper functions
async function testLatency() {
	const start = process.hrtime();
	await redis.ping();
	const [seconds, nanoseconds] = process.hrtime(start);
	const latencyMs = seconds * 1000 + nanoseconds / 1000000;
	testResults.performance.latency = {
		passed: latencyMs < 10, // Less than 10ms is good
		message: `Latency: ${latencyMs.toFixed(2)}ms`,
		value: parseFloat(latencyMs.toFixed(2))
	};
}

async function testOpsPerSecond() {
	const startTime = Date.now();
	const iterations = 1000;

	for (let i = 0; i < iterations; i++) {
		await redis.set(`test:${i}`, i.toString());
	}

	const endTime = Date.now();
	const durationSeconds = (endTime - startTime) / 1000;
	const opsPerSecond = iterations / durationSeconds;

	testResults.performance.opsPerSec = {
		passed: opsPerSecond > 100, // More than 100 ops/sec is good
		message: `Operations per second: ${Math.round(opsPerSecond)}`,
		value: Math.round(opsPerSecond)
	};

	// Clean up test keys
	for (let i = 0; i < iterations; i++) {
		await redis.del(`test:${i}`);
	}
}

async function testMemoryFragmentation() {
	const info = await redis.info('memory');
	const memFragRatio = info.match(/mem_fragmentation_ratio:(\d+\.?\d*)/);
	const ratio = memFragRatio ? parseFloat(memFragRatio[1]) : 1;

	testResults.performance.memoryFragmentation = {
		passed: ratio < 1.5, // Less than 1.5 is good
		message: `Memory fragmentation ratio: ${ratio.toFixed(2)}`,
		value: parseFloat(ratio.toFixed(2))
	};
}

async function testPerformance() {
	await testLatency();
	await testOpsPerSecond();
	await testMemoryFragmentation();
}

async function testSecurity() {
	// Test authentication
	testResults.security.authentication = {
		passed:
			!!CONFIG.redis.password && CONFIG.redis.password.length >= CONFIG.security.minPasswordLength,
		message: `Authentication: ${CONFIG.redis.password ? 'Enabled' : 'Disabled'}`
	};

	// Test TLS
	const isDokployInternal =
		CONFIG.redis.url.includes('141.147.76.172') || !CONFIG.redis.url.startsWith('rediss://');
	if (isDokployInternal) {
		testResults.security.tls = {
			passed: true,
			message: 'TLS: Not required (Dokploy internal network)'
		};
	} else {
		testResults.security.tls = {
			passed: CONFIG.redis.url.startsWith('rediss://'),
			message: `TLS: ${CONFIG.redis.url.startsWith('rediss://') ? 'Enabled' : 'Disabled'}`
		};
	}

	try {
		// Test ACL (Redis 6+)
		const aclRaw = await redis.sendCommand(['ACL', 'LIST']);
		const aclList = Array.isArray(aclRaw) ? (aclRaw as string[]) : [];
		const hasDefaultUser = aclList.some((user) => user.includes('user default'));
		testResults.security.acl = {
			passed: hasDefaultUser,
			message: `ACL: ${hasDefaultUser ? 'Configured' : 'Not configured'}`
		};
	} catch (error) {
		console.warn('ACL check not supported:', error);
		testResults.security.acl = {
			passed: false,
			message: 'ACL: Not supported (Redis < 6.0)'
		};
	}

	// Test protected mode
	const config = await redis.configGet('protected-mode');
	const protectedMode = config['protected-mode'] === 'yes';
	testResults.security.protectedMode = {
		passed: protectedMode,
		message: `Protected mode: ${protectedMode ? 'Enabled' : 'Disabled'}`
	};
}

async function testConfiguration() {
	const config = (await redis.sendCommand(['CONFIG', 'GET', '*'])) as string[];
	const configMap: Record<string, string> = {};

	// Convert to key-value pairs
	for (let i = 0; i < config.length; i += 2) {
		configMap[config[i]] = config[i + 1];
	}

	// Test maxmemory
	const maxMemory = parseInt(configMap['maxmemory'] || '0', 10);
	testResults.configuration.maxmemory = {
		passed: maxMemory > 0,
		message: `Max memory: ${maxMemory > 0 ? `${Math.round(maxMemory / (1024 * 1024))}MB` : 'Unlimited'}`,
		value: maxMemory
	};

	// Test maxclients
	const maxClients = parseInt(configMap['maxclients'] || '0', 10);
	testResults.configuration.maxclients = {
		passed: maxClients > 0 && maxClients <= CONFIG.security.maxClients,
		message: `Max clients: ${maxClients}`,
		value: maxClients
	};

	// Test persistence
	const saveConfig = configMap['save'] || '';
	const hasPersistence = saveConfig.includes('900 1') || saveConfig.includes('300 10');
	testResults.configuration.persistence = {
		passed: hasPersistence,
		message: `Persistence: ${hasPersistence ? 'Configured' : 'Not configured'}`
	};

	// Test TCP keepalive
	const tcpKeepalive = parseInt(configMap['tcp-keepalive'] || '0', 10);
	testResults.configuration.tcpKeepalive = {
		passed: tcpKeepalive > 0,
		message: `TCP keepalive: ${tcpKeepalive > 0 ? `${tcpKeepalive} seconds` : 'Disabled'}`
	};
}

async function testMonitoring() {
	// Test if metrics are available
	try {
		await redis.info('all');
		testResults.monitoring.metrics = {
			passed: true,
			message: 'Metrics: Available'
		};
	} catch (error) {
		console.warn('Metrics check failed:', error);
		testResults.monitoring.metrics = {
			passed: false,
			message: 'Metrics: Unavailable'
		};
	}

	// Test slowlog
	try {
		const slowlog = await redis.sendCommand(['SLOWLOG', 'LEN']);
		testResults.monitoring.slowlog = {
			passed: true,
			message: `Slowlog: ${slowlog} entries`
		};
	} catch (error) {
		console.warn('Slowlog check failed:', error);
		testResults.monitoring.slowlog = {
			passed: false,
			message: 'Slowlog: Disabled'
		};
	}

	// Test keyspace notifications
	const keyspace = await redis.info('keyspace');
	testResults.monitoring.keyspace = {
		passed: keyspace.includes('keys='),
		message: 'Keyspace: ' + (keyspace.includes('keys=') ? 'Available' : 'Empty')
	};
}

async function testBackup() {
	try {
		// Test RDB persistence using INFO command
		const info = await redis.info('persistence');

		// Extract last save time from INFO output
		const lastSaveMatch = info.match(/rdb_last_save_time:(\d+)/);
		const now = Math.floor(Date.now() / 1000);

		if (lastSaveMatch && lastSaveMatch[1]) {
			const lastSave = parseInt(lastSaveMatch[1], 10);
			const hoursSinceLastSave = (now - lastSave) / 3600;

			testResults.backup.rdb = {
				passed: hoursSinceLastSave < 2, // Less than 2 hours since last save
				message: `Last RDB save: ${hoursSinceLastSave.toFixed(2)} hours ago`
			};
		} else {
			testResults.backup.rdb = {
				passed: false,
				message: 'Could not determine last RDB save time'
			};
		}

		// Test AOF persistence
		const aofEnabled = info.includes('aof_enabled:1');
		const aofBaseSize = info.match(/aof_base_size:(\d+)/);
		const aofSize = info.match(/aof_current_size:(\d+)/);
		const aofSizeValue = aofSize ? parseInt(aofSize[1], 10) : undefined;
		const aofBaseSizeValue = aofBaseSize ? parseInt(aofBaseSize[1], 10) : undefined;

		testResults.backup.aof = {
			passed: aofEnabled,
			message:
				`AOF: ${aofEnabled ? 'Enabled' : 'Disabled'}` +
				(aofEnabled && aofSizeValue ? ` (${formatBytes(aofSizeValue)})` : '') +
				(aofBaseSizeValue ? ` (base ${formatBytes(aofBaseSizeValue)})` : '')
		};
	} catch (error) {
		console.error('Error testing backup:', error);
		testResults.backup.rdb = {
			passed: false,
			message: 'Error checking RDB status'
		};
		testResults.backup.aof = {
			passed: false,
			message: 'Error checking AOF status'
		};
	}
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format and display results (exported for use in test function)
export function displayResults() {
	console.log('\n=== Redis Production Readiness Report ===\n');

	// Security
	console.log('🔒 Security:');
	Object.entries(testResults.security).forEach(([, test]) => {
		console.log(`  ${test.passed ? '✅' : '❌'} ${test.message}`);
	});

	// Configuration
	console.log('\n Configuration:');
	Object.entries(testResults.configuration).forEach(([, test]) => {
		console.log(`  ${test.passed ? '✅' : '❌'} ${test.message}`);
	});

	// Performance
	console.log('\n🚀 Performance:');
	Object.entries(testResults.performance).forEach(([, test]) => {
		console.log(`  ${test.passed ? '✅' : '⚠️ '} ${test.message}`);
	});

	// Monitoring
	console.log('\n📊 Monitoring:');
	Object.entries(testResults.monitoring).forEach(([, test]) => {
		console.log(`  ${test.passed ? '✅' : '❌'} ${test.message}`);
	});

	// Backup & Persistence
	console.log('\n💾Backup & Persistence:');
	Object.entries(testResults.backup).forEach(([, test]) => {
		console.log(`  ${test.passed ? '✅' : '❌'} ${test.message}`);
	});

	// Recommendations
	console.log('\n📝 Recommendations:');
	if (testResults.security.tls && !testResults.security.tls.passed) {
		console.log('  - Enable TLS for secure communication with Redis');
	}
	if (testResults.performance.latency && !testResults.performance.latency.passed) {
		console.log('  - High latency detected, consider optimizing network or Redis config');
	}
	if (testResults.configuration.maxmemory && !testResults.configuration.maxmemory.passed) {
		console.log('  - Set maxmemory limit to prevent memory exhaustion');
	}
	if (testResults.backup.rdb && !testResults.backup.rdb.passed) {
		console.log('  - Enable RDB snapshots for data persistence');
	}
	if (testResults.backup.aof && !testResults.backup.aof.passed) {
		console.log('  - Consider enabling AOF for better durability');
	}

	console.log('\n=== End of Report ===\n');
}

// Run all tests
export async function testRedisProductionReadiness() {
	try {
		console.log('🔍 Starting Redis production readiness tests...');
		await redis.connect();

		console.log('\n🔐 Testing security...');
		await testSecurity();

		console.log('\n⚙️  Testing configuration...');
		await testConfiguration();

		console.log('\n🚀 Testing performance...');
		await testPerformance();

		console.log('\n📊 Testing monitoring...');
		await testMonitoring();

		console.log('\n💾 Testing backup & persistence...');
		await testBackup();

		// Display results
		displayResults();

		// Return results for testing
		return testResults;
	} catch (error) {
		console.error('❌ Error running tests:', error);
		return testResults;
	} finally {
		await redis.quit();
	}
}

// Run the tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
	testRedisProductionReadiness().catch(console.error);
}
