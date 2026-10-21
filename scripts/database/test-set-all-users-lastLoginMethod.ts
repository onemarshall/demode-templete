#!/usr/bin/env bun
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
	connectionString: process.env.BETTER_DATABASE_URL
});

async function setAllUsersLastLoginMethod() {
	const client = await pool.connect();
	try {
		console.log('Setting lastLoginMethod for all users...');

		// Get all users
		const userResult = await client.query(`
			SELECT id, email FROM "user";
		`);

		console.log(`Found ${userResult.rows.length} users`);

		// Update all users
		await client.query(`
			UPDATE "user" SET "lastLoginMethod" = 'email' WHERE "lastLoginMethod" IS NULL;
		`);

		console.log('✓ Updated all users with NULL lastLoginMethod to "email"');

		// Verify
		const verify = await client.query(`
			SELECT id, email, "lastLoginMethod" FROM "user";
		`);

		console.log('\nAll users:');
		verify.rows.forEach((row) => {
			console.log(`  - ${row.email}: ${row.lastLoginMethod}`);
		});
	} catch (error) {
		console.error('Error:', error);
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

// Export for testing
export { setAllUsersLastLoginMethod as testSetAllUsersLastLoginMethod };

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
	setAllUsersLastLoginMethod();
}
