#!/usr/bin/env bun
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
	connectionString: process.env.BETTER_DATABASE_URL
});

async function checkUserFields() {
	const client = await pool.connect();
	try {
		console.log('Checking user table structure...');

		// Get all columns in user table
		const result = await client.query(`
			SELECT column_name, data_type, is_nullable
			FROM information_schema.columns 
			WHERE table_name = 'user'
			ORDER BY ordinal_position;
		`);

		console.log('\nUser table columns:');
		result.rows.forEach((row) => {
			console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
		});

		// Get a sample user
		console.log('\nSample user record:');
		const userResult = await client.query(`
			SELECT * FROM "user" LIMIT 1;
		`);

		if (userResult.rows.length > 0) {
			const user = userResult.rows[0];
			console.log('User fields:', Object.keys(user));
			console.log('lastLoginMethod value:', user.lastLoginMethod);
		} else {
			console.log('No users found in database');
		}
	} catch (error) {
		console.error('Error:', error);
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

// Export for testing
export { checkUserFields as testCheckUserFields };

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
	checkUserFields();
}
