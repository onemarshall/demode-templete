/**
 * Fix SIWE Duplicate User Errors
 *
 * This script handles the case where a user tries to sign in with SIWE multiple times.
 * Better Auth's SIWE plugin generates an email from the wallet address (e.g., 0x{address}@{domain}).
 * If the user signs in twice, it tries to create the same user twice, causing a duplicate key error.
 *
 * This script:
 * 1. Finds all users with SIWE emails (0x...@domain)
 * 2. Checks if there are duplicates
 * 3. Merges duplicate SIWE users if needed
 *
 * Usage: bun run scripts/database/fix-siwe-duplicates.ts
 */

import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const logger = {
	info: (msg: string, data?: unknown) => console.log(`[INFO] ${msg}`, data || ''),
	error: (msg: string, data?: unknown) => console.error(`[ERROR] ${msg}`, data || '')
};

async function fixSIWEDuplicates() {
	const databaseUrl = process.env.BETTER_DATABASE_URL;
	if (!databaseUrl) {
		logger.error('BETTER_DATABASE_URL not configured');
		process.exit(1);
	}

	const pool = new Pool({
		connectionString: databaseUrl
	});

	try {
		logger.info('Starting SIWE duplicate fix...');

		// Get all users with SIWE emails (0x...@domain pattern)
		const result = await pool.query(
			`SELECT id, email, "createdAt" FROM "user" WHERE email LIKE '0x%@%' ORDER BY email, "createdAt"`
		);

		const users = result.rows as Array<{ id: string; email: string; createdAt: Date }>;
		logger.info(`Found ${users.length} users with SIWE emails`);

		// Group by email to find duplicates
		const emailGroups = new Map<string, Array<{ id: string; createdAt: Date }>>();
		for (const user of users) {
			if (!emailGroups.has(user.email)) {
				emailGroups.set(user.email, []);
			}
			emailGroups.get(user.email)!.push({ id: user.id, createdAt: user.createdAt });
		}

		// Find duplicates
		const duplicates = Array.from(emailGroups.entries()).filter(([, users]) => users.length > 1);
		logger.info(`Found ${duplicates.length} duplicate SIWE emails`);

		if (duplicates.length === 0) {
			logger.info('No SIWE duplicates found');
			await pool.end();
			return;
		}

		// For each duplicate, keep the oldest user and delete the newer ones
		for (const [email, userList] of duplicates) {
			// Sort by createdAt to find the oldest
			userList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

			const [oldestUser, ...newerUsers] = userList;
			logger.info(`Handling duplicate SIWE email: ${email}`, {
				oldestUserId: oldestUser.id,
				newerUserIds: newerUsers.map((u) => u.id)
			});

			// Delete newer users (they were failed attempts to create the same user)
			for (const newerUser of newerUsers) {
				logger.info(`Deleting duplicate user: ${newerUser.id}`);

				// Delete associated data first
				await pool.query('DELETE FROM "session" WHERE "userId" = $1', [newerUser.id]);
				await pool.query('DELETE FROM "account" WHERE "userId" = $1', [newerUser.id]);
				await pool.query('DELETE FROM "passkey" WHERE "userId" = $1', [newerUser.id]);
				await pool.query('DELETE FROM "twoFactor" WHERE "userId" = $1', [newerUser.id]);

				// Delete the user
				await pool.query('DELETE FROM "user" WHERE id = $1', [newerUser.id]);
				logger.info(`Deleted duplicate user: ${newerUser.id}`);
			}
		}

		logger.info('SIWE duplicate fix completed successfully');
	} catch (error) {
		logger.error('Error fixing SIWE duplicates', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		throw error;
	} finally {
		await pool.end();
	}
}

// Run the fix when executed directly (avoid process.exit during tests)
if (typeof require !== 'undefined' && require.main === module) {
	fixSIWEDuplicates().catch((error) => {
		console.error('Failed to fix SIWE duplicates:', error);
		process.exit(1);
	});
}
