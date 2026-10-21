/**
 * Fix SIWE Duplicate User Errors
 *
 * This script provides two solutions:
 *
 * 1. IMMEDIATE FIX: Clean up existing duplicate SIWE users
 *    Run: bun run scripts/database/fix-siwe-duplicates.ts
 *
 * 2. LONG-TERM FIX: Create a database view that handles SIWE user lookups
 *    This script creates a view that Better Auth can use to find existing SIWE users
 *    before attempting to create a new one.
 *
 * Usage: bun run scripts/database/fix-siwe-constraint.ts
 */

import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const logger = {
	info: (msg: string, data?: unknown) => console.log(`[INFO] ${msg}`, data || ''),
	error: (msg: string, data?: unknown) => console.error(`[ERROR] ${msg}`, data || ''),
	success: (msg: string, data?: unknown) => console.log(`[SUCCESS] ${msg}`, data || '')
};

async function fixSIWEConstraint() {
	const databaseUrl = process.env.BETTER_DATABASE_URL;
	if (!databaseUrl) {
		logger.error('BETTER_DATABASE_URL not configured');
		process.exit(1);
	}

	const pool = new Pool({
		connectionString: databaseUrl
	});

	try {
		logger.info('Starting SIWE constraint analysis...');

		// Check for duplicate SIWE users
		const duplicatesResult = await pool.query(
			`SELECT email, COUNT(*) as count FROM "user" 
			 WHERE email LIKE '0x%@%' 
			 GROUP BY email 
			 HAVING COUNT(*) > 1`
		);

		if (duplicatesResult.rows.length > 0) {
			logger.info(`Found ${duplicatesResult.rows.length} duplicate SIWE emails`);
			logger.info('Please run the cleanup script first:');
			logger.info('  bun run scripts/database/fix-siwe-duplicates.ts');
			await pool.end();
			return;
		}

		logger.info('No duplicate SIWE users found ✓');

		// Create a view for SIWE user lookups
		const createViewSQL = `
			CREATE OR REPLACE VIEW siwe_users AS
			SELECT 
				id,
				email,
				name,
				image,
				"emailVerified",
				"createdAt",
				"updatedAt",
				SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1) as wallet_address,
				SUBSTRING(email FROM POSITION('@' IN email) + 1) as email_domain
			FROM "user"
			WHERE email LIKE '0x%@%';
		`;

		logger.info('Creating SIWE users view...');
		await pool.query(createViewSQL);
		logger.success('Created siwe_users view');

		// Create an index on SIWE emails for faster lookups
		const createIndexSQL = `
			CREATE INDEX IF NOT EXISTS idx_user_siwe_email 
			ON "user" (email) 
			WHERE email LIKE '0x%@%';
		`;

		logger.info('Creating index on SIWE emails...');
		await pool.query(createIndexSQL);
		logger.success('Created idx_user_siwe_email index');

		logger.success('SIWE constraint setup completed successfully');
		logger.info('');
		logger.info('Summary:');
		logger.info('  ✓ No duplicate SIWE users found');
		logger.info('  ✓ Created siwe_users view for lookups');
		logger.info('  ✓ Created index on SIWE emails');
		logger.info('');
		logger.info('To prevent future duplicates:');
		logger.info('  1. Run cleanup script if duplicates exist:');
		logger.info('     bun run scripts/database/fix-siwe-duplicates.ts');
		logger.info('  2. Modify Better Auth SIWE plugin to check for existing users');
		logger.info('  3. Or add a database trigger to handle duplicate inserts');
	} catch (error) {
		logger.error('Error setting up SIWE constraint', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		throw error;
	} finally {
		await pool.end();
	}
}

// Run the fix when executed directly (avoid process.exit during tests)
if (typeof require !== 'undefined' && require.main === module) {
	fixSIWEConstraint().catch((error) => {
		console.error('Failed to set up SIWE constraint:', error);
		process.exit(1);
	});
}
