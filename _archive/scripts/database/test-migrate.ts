#!/usr/bin/env bun
/**
 * Database Migration Script for Better Auth
 *
 * This script handles database migrations for the better-auth setup.
 * It can create tables, run migrations, and verify the database state.
 */

import { Pool } from 'pg';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { logger } from '../../src/lib/platform/logger';

// Load environment variables
dotenv.config();

interface MigrationOptions {
	force?: boolean;
	skipVerification?: boolean;
	dryRun?: boolean;
	verbose?: boolean;
}

class DatabaseMigrator {
	private pool: Pool;
	private databaseUrl: string;

	constructor() {
		this.databaseUrl = process.env.BETTER_DATABASE_URL || process.env.DATABASE_URL || '';

		if (!this.databaseUrl) {
			throw new Error(
				'Database URL not found. Please set BETTER_DATABASE_URL or DATABASE_URL environment variable.'
			);
		}

		this.pool = new Pool({
			connectionString: this.databaseUrl,
			max: 1 // Use only one connection for migrations
		});
	}

	/**
	 * Check if the database is accessible
	 */
	async checkDatabaseConnection(): Promise<boolean> {
		try {
			const client = await this.pool.connect();
			await client.query('SELECT NOW()');
			client.release();
			logger.success('Database connection established');
			return true;
		} catch (error) {
			logger.error('Database connection failed:', error);
			return false;
		}
	}

	/**
	 * Check if better-auth tables exist
	 */
	async checkTablesExist(): Promise<{ exists: boolean; tables: string[] }> {
		try {
			const client = await this.pool.connect();
			const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%auth%' OR table_name IN ('user', 'session', 'account', 'verification')
        ORDER BY table_name;
      `);
			client.release();

			const tables = result.rows.map((row) => row.table_name);
			return {
				exists: tables.length > 0,
				tables
			};
		} catch (error) {
			logger.error('Failed to check tables:', error);
			return { exists: false, tables: [] };
		}
	}

	/**
	 * Run better-auth CLI migration
	 */
	async runBetterAuthMigration(options: MigrationOptions = {}): Promise<boolean> {
		try {
			logger.info('Running better-auth migration...');

			// Try to find config file (prefer standard locations for better-auth CLI)
			const standardAuthPath = join(process.cwd(), 'src/lib/auth.ts');
			const libAuthPath = join(process.cwd(), 'src/lib/server/auth/config.ts');
			const jsConfigPath = join(process.cwd(), 'better-auth.config.js');
			const tsConfigPath = join(process.cwd(), 'better-auth.config.ts');

			let configPath: string;
			if (existsSync(standardAuthPath)) {
				// Use the standard auth config location
				configPath = standardAuthPath;
				logger.info('Using standard auth configuration (src/lib/auth.ts)');
			} else if (existsSync(libAuthPath)) {
				// Use the main auth config from reorganized structure
				configPath = libAuthPath;
				logger.info('Using reorganized auth configuration');
			} else if (existsSync(jsConfigPath)) {
				configPath = jsConfigPath;
				logger.info('Using migration-specific JS config');
			} else if (existsSync(tsConfigPath)) {
				configPath = tsConfigPath;
				logger.info('Using migration-specific TS config');
			} else {
				throw new Error('No auth configuration found. Please ensure src/lib/auth.ts exists.');
			}

			const migrationArgs = [
				'npx @better-auth/cli migrate',
				`--config ${configPath}`,
				options.force ? '-y' : ''
			]
				.filter(Boolean)
				.join(' ');

			if (options.dryRun) {
				logger.info('Dry run - would execute:', migrationArgs);
				return true;
			}

			const output = execSync(migrationArgs, {
				encoding: 'utf8',
				stdio: options.verbose ? 'inherit' : 'pipe'
			});

			if (options.verbose) {
				logger.info('Migration output:', output);
			}

			logger.success('Better Auth migration completed successfully');
			return true;
		} catch (error) {
			logger.error('Migration failed:', error);
			return false;
		}
	}

	/**
	 * Verify migration success
	 */
	async verifyMigration(): Promise<boolean> {
		try {
			logger.info('Verifying migration...');

			const { exists, tables } = await this.checkTablesExist();

			if (!exists) {
				logger.error('No auth-related tables found after migration');
				return false;
			}

			logger.success(`Migration verified. Found ${tables.length} tables:`, tables);

			// Check if we can insert/query basic data
			const client = await this.pool.connect();

			// Try to query the user table (most common better-auth table)
			if (tables.includes('user')) {
				const userCount = await client.query('SELECT COUNT(*) FROM "user"');
				logger.info(`User table contains ${userCount.rows[0].count} records`);
			}

			client.release();
			return true;
		} catch (error) {
			logger.error('Migration verification failed:', error);
			return false;
		}
	}

	/**
	 * Create a backup of existing data (if any)
	 */
	async createBackup(dryRun: boolean = false): Promise<string | null> {
		try {
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const backupFile = `backup-${timestamp}.sql`;

			logger.info('Creating database backup...');

			// Check if pg_dump is available
			try {
				execSync('which pg_dump', { stdio: 'pipe' });
			} catch {
				logger.warn('pg_dump not found. Skipping backup creation.');
				logger.info('To create backups, install PostgreSQL client tools:');
				logger.info('  macOS: brew install postgresql');
				logger.info('  Ubuntu: sudo apt-get install postgresql-client');
				return null;
			}

			// Parse connection string to get individual components
			const url = new URL(this.databaseUrl);
			const host = url.hostname;
			const port = url.port || '5432';
			const database = url.pathname.slice(1);
			const username = url.username;
			const password = url.password;

			const pgDumpCmd = [
				'pg_dump',
				`--host=${host}`,
				`--port=${port}`,
				`--username=${username}`,
				`--dbname=${database}`,
				'--verbose',
				'--clean',
				'--no-owner',
				'--no-privileges',
				`--file=${backupFile}`
			].join(' ');

			if (dryRun) {
				logger.info('Dry run - would execute backup:', pgDumpCmd);
				return backupFile;
			}

			// Set password as environment variable
			const env = { ...process.env, PGPASSWORD: password };

			execSync(pgDumpCmd, { env, stdio: 'inherit' });

			logger.success(`Backup created: ${backupFile}`);
			return backupFile;
		} catch (error) {
			logger.error('Backup creation failed:', error);
			return null;
		}
	}

	/**
	 * Clean up resources
	 */
	async cleanup(): Promise<void> {
		await this.pool.end();
	}
}

/**
 * Main migration function
 */
async function runMigration(options: MigrationOptions = {}) {
	const migrator = new DatabaseMigrator();

	try {
		logger.info('Starting database migration process...');

		// Check database connection
		const connected = await migrator.checkDatabaseConnection();
		if (!connected) {
			throw new Error('Cannot connect to database');
		}

		// Check existing tables
		const { exists, tables } = await migrator.checkTablesExist();

		if (exists && !options.force) {
			logger.info(`Found existing tables: ${tables.join(', ')}`);
			logger.info('Use --force to override existing tables');

			// Create backup if tables exist (skip in dry run)
			if (!options.dryRun) {
				const backupResult = await migrator.createBackup(options.dryRun);
				if (!backupResult) {
					logger.warn('Backup creation failed, but continuing with migration...');
				}
			} else {
				logger.info('Dry run - would create backup before migration');
			}
		}

		// Run migration
		const migrationSuccess = await migrator.runBetterAuthMigration(options);
		if (!migrationSuccess) {
			throw new Error('Migration failed');
		}

		// Verify migration
		if (!options.skipVerification) {
			const verificationSuccess = await migrator.verifyMigration();
			if (!verificationSuccess) {
				throw new Error('Migration verification failed');
			}
		}

		logger.success('Migration completed successfully!');
	} catch (error) {
		logger.error('Migration process failed:', error);
		process.exit(1);
	} finally {
		await migrator.cleanup();
	}
}

// CLI argument parsing
function parseArgs(): MigrationOptions {
	const args = process.argv.slice(2);
	const options: MigrationOptions = {};

	if (args.includes('--force') || args.includes('-f')) {
		options.force = true;
	}

	if (args.includes('--skip-verification')) {
		options.skipVerification = true;
	}

	if (args.includes('--dry-run')) {
		options.dryRun = true;
	}

	if (args.includes('--verbose') || args.includes('-v')) {
		options.verbose = true;
	}

	return options;
}

// Show help
function showHelp() {
	console.log(`
Database Migration Script for Better Auth

Usage: bun run scripts/migrate.ts [options]

Options:
  --force, -f           Force migration even if tables exist
  --skip-verification   Skip post-migration verification
  --dry-run            Show what would be executed without running
  --verbose, -v        Show detailed output
  --help, -h           Show this help message

Examples:
  bun run scripts/migrate.ts                    # Run migration with verification
  bun run scripts/migrate.ts --force            # Force migration
  bun run scripts/migrate.ts --dry-run          # Preview migration
  bun run scripts/migrate.ts --verbose          # Detailed output
`);
}

// Main execution
if (import.meta.main) {
	const args = process.argv.slice(2);

	if (args.includes('--help') || args.includes('-h')) {
		showHelp();
		process.exit(0);
	}

	const options = parseArgs();
	runMigration(options);
}

export { DatabaseMigrator, runMigration };
