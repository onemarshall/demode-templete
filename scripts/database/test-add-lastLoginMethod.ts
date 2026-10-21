#!/usr/bin/env bun
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
	connectionString: process.env.BETTER_DATABASE_URL
});

async function addLastLoginMethodField() {
	const client = await pool.connect();
	try {
		console.log('Checking if lastLoginMethod column exists...');

		// Check if column already exists
		const columnCheck = await client.query(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name = 'user' AND column_name = 'lastLoginMethod'
		`);

		if (columnCheck.rows.length > 0) {
			console.log('✓ lastLoginMethod column already exists');
			return;
		}

		console.log('Adding lastLoginMethod column...');

		// Add the column
		await client.query(`
			ALTER TABLE "user" 
			ADD COLUMN "lastLoginMethod" VARCHAR(50)
		`);

		console.log('✓ lastLoginMethod column added successfully');

		// Verify the column was added
		const verifyCheck = await client.query(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name = 'user' AND column_name = 'lastLoginMethod'
		`);

		if (verifyCheck.rows.length > 0) {
			console.log('✓ Column verification successful');
		} else {
			throw new Error('Column verification failed');
		}
	} catch (error) {
		console.error('❌ Error adding lastLoginMethod column:', error);
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

// Export for testing
export { addLastLoginMethodField as testAddLastLoginMethod };

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
	addLastLoginMethodField();
}
