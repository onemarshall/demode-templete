// scripts/database/add-provider-column.ts
import { Pool } from 'pg';

const DATABASE_URL: string = (() => {
	const url = Bun.env.BETTER_DATABASE_URL;
	if (!url) throw new Error('BETTER_DATABASE_URL is required');
	return url;
})();

async function main() {
	const pool = new Pool({ connectionString: DATABASE_URL });

	try {
		await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "provider" TEXT;`);
		await pool.query(`UPDATE "user" SET "provider" = 'email' WHERE "provider" IS NULL;`);
		await pool.query(`ALTER TABLE "user" ALTER COLUMN "provider" SET DEFAULT 'email';`);
		await pool.query(`ALTER TABLE "user" ALTER COLUMN "provider" SET NOT NULL;`);
		console.log('✓ provider column ensured on user table');
	} finally {
		await pool.end();
	}
}

main().catch((err) => {
	console.error('Failed:', err.message);
	process.exit(1);
});
