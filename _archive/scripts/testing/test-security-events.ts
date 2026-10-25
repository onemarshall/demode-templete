#!/usr/bin/env bun

/**
 * Test script to verify security event recording
 * Run this script to test if the security collector is working
 */

import { getDefaultCollector } from '#lib/modules/auth/security/analytics/index.js';
import { createSecurityContext } from '#lib/modules/auth/security/core/context.js';

async function testSecurityEvents() {
	console.log('🧪 Testing Security Event Recording...\n');

	const collector = getDefaultCollector();

	// Create a mock request
	const mockRequest = new Request('http://localhost:5173/api/auth/sign-in', {
		method: 'POST',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Test Browser)',
			'X-Forwarded-For': '192.168.1.100',
			'X-Real-IP': '192.168.1.100'
		}
	});

	// Create security context
	const ctx = createSecurityContext(mockRequest);
	ctx.userId = 'test-user-123';
	ctx.riskScore = 25;
	ctx.riskLevel = 'low';

	// Test 1: Record successful login
	console.log('1. Recording successful login event...');
	await collector.recordEvent(ctx, 'auth_success', {
		success: true,
		timestamp: Date.now(),
		location: 'New York, US'
	});

	// Test 2: Record failed login
	console.log('2. Recording failed login event...');
	await collector.recordEvent(ctx, 'auth_failure', {
		success: false,
		reason: 'invalid_password',
		timestamp: Date.now()
	});

	// Test 3: Record suspicious activity
	console.log('3. Recording suspicious activity...');
	await collector.recordEvent(ctx, 'suspicious_activity', {
		type: 'rapid_requests',
		count: 10,
		timeWindow: 5000,
		timestamp: Date.now()
	});

	// Get recent events
	console.log('\n📊 Retrieving recorded events...');
	const events = await collector.getRecentEvents(10);

	console.log(`\n✅ Found ${events.length} events:`);
	events.forEach((event, index) => {
		console.log(`\n${index + 1}. Event ID: ${event.id}`);
		console.log(`   Type: ${event.type}`);
		console.log(`   User ID: ${event.userId}`);
		console.log(`   IP: ${event.ip}`);
		console.log(`   Risk Score: ${event.riskScore}`);
		console.log(`   Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
		console.log(`   Metadata:`, event.metadata);
	});

	// Test stats
	const stats = collector.getStats();
	console.log('\n📈 Collector Statistics:');
	console.log(`   Total Events: ${stats.totalEvents}`);
	console.log(`   Sampled Events: ${stats.sampledEvents}`);
	console.log(`   Buffer Size: ${stats.bufferSize}`);
	console.log(`   Sampling Rate: ${(stats.samplingRate * 100).toFixed(1)}%`);

	console.log('\n✅ Security event recording test completed!');
	console.log(
		'\n💡 Tip: Now try signing in/signing up in the browser to see real events appear in the Security Dashboard at /admin/security'
	);
}

// Run the test
testSecurityEvents().catch(console.error);
