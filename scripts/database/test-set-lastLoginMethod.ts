#!/usr/bin/env bun
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
	connectionString: process.env.BETTER_DATABASE_URL
});

async function setLastLoginMethod() {
	const client = await pool.connect();
	try {
		console.log('Setting lastLoginMethod for test user...');

		// Get the first user; create one if none exists to keep test stable
		const userResult = await client.query(`
			SELECT id, email FROM "user" LIMIT 1;
		`);
		let createdUser: { id: string; email: string } | null = null;

		if (userResult.rows.length === 0) {
			const id = crypto.randomUUID();
			const email = `test+lastlogin-${Date.now()}@example.com`;
			await client.query(
				`
				INSERT INTO "user" (id, name, email, "emailVerified", provider)
				VALUES ($1, $2, $3, $4, $5);
			`,
				[id, 'Test User', email, false, 'email']
			);
			console.log(`Created test user: ${email} (${id})`);
			createdUser = { id, email };
		}

		const user = createdUser ?? userResult.rows[0];
		if (!user) {
			console.log('No users found in database');
			return;
		}
		console.log(`Found user: ${user.email} (${user.id})`);

		// Update lastLoginMethod
		await client.query(
			`
			UPDATE "user" SET "lastLoginMethod" = 'email' WHERE id = $1;
		`,
			[user.id]
		);

		console.log('✓ Updated lastLoginMethod to "email"');

		// Verify
		const verify = await client.query(
			`
			SELECT id, email, "lastLoginMethod" FROM "user" WHERE id = $1;
		`,
			[user.id]
		);

		const updatedUser = verify.rows[0];
		console.log('Verified:', updatedUser);
	} catch (error) {
		console.error('Error:', error);
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

// Export for testing
export { setLastLoginMethod as testSetLastLoginMethod };

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
	setLastLoginMethod();
}
