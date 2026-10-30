#!/usr/bin/env bun
/**
 * Phase 1 proof: the `diagnostic` and `content` schemas exist, are empty, and
 * cannot shadow the application's own tables.
 *
 *   docker run -d --rm --name montsel-schema-verify \
 *     -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_schema_verify \
 *     -p 127.0.0.1:55443:5432 postgres:16
 *
 *   MONTSEL_SCHEMA_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55443/montsel_schema_verify \
 *     bun scripts/diagnostic/verify-schemas.ts
 *
 * Proves, with no engine, no Directus and no application request:
 *   - a fresh database reaches migration 0022
 *   - both schemas exist, with no tables of their own but the engine's ledger
 *   - the engine's ledger is separate from the app's and starts empty
 *   - `content` carries no ledger of ours, so Directus keeps sole ownership
 *   - 0022 added nothing to `public` and collides with nothing in it
 *   - an unqualified name still resolves to `public`, so an engine table cannot
 *     shadow an app table
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	assert,
	closeDisposableDatabase,
	prepareDisposableDatabase,
	PROJECT_ROOT,
	requireSafeDatabase
} from './disposable-db.ts';

const DATABASE_NAME = 'montsel_schema_verify';
const url = requireSafeDatabase(process.env.MONTSEL_SCHEMA_VERIFY_DATABASE_URL, DATABASE_NAME);

const database = await prepareDisposableDatabase(url, 22);
const { pool } = database;

try {
	const scalar = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
		const { rows } = await pool.query(sql, params);
		return Object.values(rows[0] ?? {})[0] as T;
	};

	// 1. Both schemas exist.
	for (const name of ['diagnostic', 'content']) {
		assert(
			await scalar<boolean>('SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1)', [name]),
			`Schema ${name} was not created.`
		);
	}

	// 2. The engine's ledger is separate, correctly shaped and empty.
	const ledger = await pool.query<{ column_name: string; data_type: string }>(
		`SELECT column_name, data_type FROM information_schema.columns
		 WHERE table_schema = 'diagnostic' AND table_name = 'schema_migrations'
		 ORDER BY ordinal_position`
	);
	assert(
		JSON.stringify(ledger.rows.map((row) => row.column_name)) ===
			JSON.stringify(['version', 'name', 'checksum', 'applied_at']),
		`The engine ledger has the wrong shape: ${ledger.rows.map((row) => row.column_name).join(', ')}`
	);
	assert(
		(await scalar<number>('SELECT count(*)::int FROM "diagnostic"."schema_migrations"')) === 0,
		'The engine ledger was not empty on a fresh database.'
	);
	assert(
		(await scalar<boolean>(
			`SELECT to_regclass('diagnostic.schema_migration_attempts') IS NOT NULL`
		)),
		'The engine attempt log is missing.'
	);

	// 3. `content` has no ledger of ours; Directus owns its own migration state.
	assert(
		!(await scalar<boolean>(`SELECT to_regclass('content.schema_migrations') IS NOT NULL`)),
		'`content` must not carry a second migration ledger.'
	);
	assert(
		(await scalar<number>(
			`SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'content'`
		)) === 0,
		'`content` must start empty; Directus creates its own tables.'
	);

	// 4. The application's journal is untouched and ends at this migration.
	assert(
		(await scalar<number>('SELECT count(*)::int FROM "public"."schema_migrations"')) === 22,
		'The application journal does not record exactly 22 migrations.'
	);
	assert(
		(await scalar<number>('SELECT max(version)::int FROM "public"."schema_migrations"')) === 22,
		'The application journal does not end at 0022.'
	);
	assert(
		(await scalar<number>(
			`SELECT count(*)::int FROM "public"."schema_migrations" WHERE name LIKE '%diagnostic_schemas%'`
		)) === 1,
		'0022 is not recorded in the application journal.'
	);

	// 5. 0022 touched nothing in `public`.
	//
	// The schema is not built from SQL migrations alone — better-auth's migrator
	// creates the auth and tenancy tables before the runner starts — so "every
	// public table is declared by a migration" is false here and would be a
	// misleading gate. What 0022 must prove instead is narrower and checkable:
	// every table it creates is schema-qualified, and it creates nothing else.
	// Comments explain the rule and quote the very DDL this check looks for, so
	// they are stripped before matching.
	const migrationSql = readFileSync(
		join(PROJECT_ROOT, 'database', 'migrations', '0022_diagnostic_schemas.sql'),
		'utf8'
	)
		.split('\n')
		.filter((line) => !line.trimStart().startsWith('--'))
		.join('\n');
	const unqualified = [...migrationSql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([^\s(]+)/g)]
		.map((match) => match[1]!)
		.filter((name) => !/^"(diagnostic|content)"\./.test(name));
	assert(
		unqualified.length === 0,
		`0022 creates tables outside the new schemas: ${unqualified.join(', ')}`
	);
	const created = await pool.query<{ table_schema: string; table_name: string }>(
		`SELECT table_schema, table_name FROM information_schema.tables
		 WHERE table_schema = 'diagnostic' AND table_type = 'BASE TABLE'
		 ORDER BY table_name`
	);
	assert(
		JSON.stringify(created.rows.map((row) => row.table_name)) ===
			JSON.stringify(['schema_migration_attempts', 'schema_migrations']),
		`0022 created unexpected tables in diagnostic: ${created.rows.map((row) => row.table_name).join(', ')}`
	);

	// 6. No domain table in the new schemas shares a name with an app table.
	//
	// The ledger pair is excluded because sharing those two names is deliberate:
	// the engine's journal mirrors the application's shape so the ported runner is
	// the same runner pointed at another schema. Sharing a *domain* name is the
	// failure — `brand`, `page` and `contact` are the ones the engine brings with
	// it, and a qualified name would still resolve, but two meanings under one
	// word is how a join silently reads the wrong table.
	const LEDGER = ['schema_migrations', 'schema_migration_attempts'];
	const collisions = (
		await pool.query<{ table_name: string }>(
			`SELECT table_name FROM information_schema.tables
			 WHERE table_schema IN ('diagnostic', 'content')
			   AND table_name <> ALL($1::text[])
			   AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public')`,
			[LEDGER]
		)
	).rows.map((row) => row.table_name);
	assert(collisions.length === 0, `New schemas collide with app tables: ${collisions.join(', ')}`);

	// 7. PUBLIC holds no privilege on either schema.
	for (const name of ['diagnostic', 'content']) {
		assert(
			!(await scalar<boolean>(
				`SELECT EXISTS (
				   SELECT 1 FROM pg_namespace n, aclexplode(n.nspacl) a
				   WHERE n.nspname = $1 AND a.grantee = 0
				 )`,
				[name]
			)),
			`PUBLIC holds a privilege on ${name}.`
		);
	}

	// 8. An unqualified name still resolves to `public`. This is the property that
	// keeps an engine table from shadowing an app table without a migration.
	const searchPath = await scalar<string>('SELECT current_setting($1)', ['search_path']);
	assert(
		!/(^|,)\s*(diagnostic|content)\s*(,|$)/.test(searchPath),
		`The new schemas reached the search_path: ${searchPath}`
	);
	assert((await scalar<string>('SELECT current_schema()')) === 'public', 'current_schema is not public.');

	// A same-named table in `diagnostic` must not change what the app reads.
	await pool.query('CREATE TABLE "diagnostic"."output" ("marker" text)');
	try {
		assert(
			(await scalar<string>(`SELECT to_regclass('output')::text`)) === 'output',
			'A diagnostic table shadowed public."output".'
		);
		assert(
			(await scalar<string>(`SELECT to_regclass('diagnostic.output')::text`)) ===
				'diagnostic.output',
			'The diagnostic table is not addressable by its qualified name.'
		);
	} finally {
		await pool.query('DROP TABLE "diagnostic"."output"');
	}

	const publicTables = await scalar<number>(
		`SELECT count(*)::int FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
	);

	console.log('Phase 1 schemas verified on the disposable database:');
	console.log(`  schemas   diagnostic, content (both empty, no PUBLIC privilege)`);
	console.log(`  ledger    diagnostic.schema_migrations, 0 rows, separate from public`);
	console.log(`  content   no ledger of ours; Directus keeps its own`);
	console.log(`  public    ${publicTables} tables, unchanged by 0022, no collisions`);
	console.log(`  search    ${searchPath} — unqualified names still resolve to public`);
	console.log('  a same-named diagnostic table cannot shadow an app table.');
} finally {
	await closeDisposableDatabase(database);
}
