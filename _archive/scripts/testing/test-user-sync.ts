import {
	createDirectus,
	rest,
	authentication,
	readUsers,
	createUser,
	updateUser
} from '@directus/sdk';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create Directus client for testing
function createTestDirectusClient() {
	const cmsUrl = process.env.PUBLIC_CMS_URL;
	const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;

	if (!cmsUrl || !adminToken) {
		throw new Error('Missing DIRECTUS_URL or DIRECTUS_ADMIN_TOKEN');
	}

	const client = createDirectus(cmsUrl).with(rest()).with(authentication('json'));
	client.setToken(adminToken);
	return client;
}

async function testUserSync() {
	try {
		// Test user data with unique email
		const timestamp = Date.now();
		const testUser = {
			id: `test-user-${timestamp}`,
			email: `test-${timestamp}@example.com`,
			emailVerified: true,
			name: 'Test User',
			provider: 'Better Auth' as const
		};

		console.log('Testing user sync...');
		const client = createTestDirectusClient();

		// 1. Test user creation
		console.log('1. Creating test user in Directus...');
		const userData = {
			first_name: 'Test',
			last_name: 'User',
			email: testUser.email.toLowerCase(),
			status: 'active',
			provider: testUser.provider,
			external_identifier: testUser.id
		};

		const createdUser = await client.request(createUser(userData));
		console.log('✅ User created:', createdUser);

		// 2. Test finding the user by email
		console.log('\n2. Finding user by email...');
		const foundUsers = await client.request(
			readUsers({
				filter: {
					email: { _eq: testUser.email.toLowerCase() }
				},
				limit: 1
			})
		);
		console.log('✅ User found:', foundUsers[0]);

		// 3. Test updating the user
		console.log('\n3. Updating user...');
		const updatedUser = await client.request(
			updateUser(createdUser.id, {
				first_name: 'Updated',
				last_name: 'Name'
			})
		);
		console.log('✅ User updated:', updatedUser);

		console.log('\n✅ All tests completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

testUserSync();
