import { createDirectus, staticToken, rest, readUsers } from '@directus/sdk';

interface DirectusError {
	response?: {
		status?: number;
	};
	message?: string;
}

// Read .env manually since we're running as a standalone script
const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;
const apiUrl = process.env.PUBLIC_CMS_URL || 'http://localhost:8051';

console.log('\n🔍 Directus Token Diagnostic Tool');
console.log('===============================');
console.log(`URL: ${apiUrl}`);
console.log(`Token Length: ${adminToken ? adminToken.length : 'MISSING'}`);
console.log(
	`Token Preview: ${adminToken ? adminToken.substring(0, 4) + '...' + adminToken.substring(adminToken.length - 4) : 'N/A'}`
);

if (!adminToken) {
	console.error('\n❌ Error: DIRECTUS_ADMIN_TOKEN is not set in your environment.');
	process.exit(1);
}

const client = createDirectus(apiUrl).with(staticToken(adminToken)).with(rest());

async function testConnection() {
	try {
		console.log('\n1️⃣  Testing connection to Directus...');
		const users = await client.request(readUsers({ limit: 1 }));
		console.log('✅ Authentication SUCCESSFUL!');
		console.log(`   Found ${users.length} users. Connection is working perfectly.`);
	} catch (error: unknown) {
		console.error('\n❌ Authentication FAILED');
		console.error('------------------------');
		const directusError = error as DirectusError;
		console.error(`Status: ${directusError.response?.status || 'Unknown'}`);
		console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);

		if (directusError.response?.status === 401) {
			console.log('\n💡 Diagnosis: 401 Unauthorized');
			console.log('   This means Directus rejected your token.');
			console.log('   1. Check if the user associated with this token is "Active"');
			console.log('   2. Verify the token in Directus Admin > User Directory > [User] > Token');
			console.log('   3. Ensure you copied the entire token without spaces');
		} else if (error instanceof Error && error.message.includes('fetch failed')) {
			console.log('\n💡 Diagnosis: Connection Refused');
			console.log('   Could not reach Directus at ' + apiUrl);
			console.log('   Is Directus running?');
		}
	}
}

testConnection();
