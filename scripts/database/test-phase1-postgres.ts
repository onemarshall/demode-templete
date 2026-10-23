#!/usr/bin/env bun
/** Run Phase 1 PostgreSQL integration tests with an isolated Vitest config. */

import { execFileSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const DATABASE_NAME = 'montsel_phase1_integration';
const DATABASE_URL = process.env.MONTSEL_PHASE1_TEST_DATABASE_URL;
const PROJECT_ROOT = resolve(import.meta.dir, '..', '..');
const TEST_FILE = resolve(PROJECT_ROOT, 'src/lib/server/workspace/__tests__/phase1-postgres.integration.test.ts');

function validateDatabaseUrl(value: string | undefined): string {
	if (!value) throw new Error(`Set MONTSEL_PHASE1_TEST_DATABASE_URL to a loopback database named ${DATABASE_NAME}.`);
	const url = new URL(value);
	const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Integration tests only run on localhost/loopback PostgreSQL.');
	if (decodeURIComponent(url.pathname.replace(/^\//, '')) !== DATABASE_NAME) {
		throw new Error(`Integration database must be named exactly ${DATABASE_NAME}.`);
	}
	if (url.searchParams.has('host') || url.searchParams.has('options')) throw new Error('Do not override the PostgreSQL host through URL options.');
	return value;
}

function main(): void {
	const databaseUrl = validateDatabaseUrl(DATABASE_URL);
	const configPath = join(PROJECT_ROOT, `.phase1-postgres-vitest-${process.pid}.config.mts`);
	const config = `
import { defineConfig } from 'vitest/config';
export default defineConfig({
  root: ${JSON.stringify(PROJECT_ROOT)},
  resolve: { alias: [
    { find: /^#lib\\/(.*)$/, replacement: ${JSON.stringify(join(PROJECT_ROOT, 'src/lib'))} + '/$1' },
    { find: /^#lib$/, replacement: ${JSON.stringify(join(PROJECT_ROOT, 'src/lib'))} }
  ] },
  test: {
    environment: 'node',
    include: [${JSON.stringify(TEST_FILE)}],
    setupFiles: [],
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 60000,
    globals: true
  }
});
`;
	writeFileSync(configPath, config, 'utf8');
	try {
		const vitest = join(PROJECT_ROOT, 'node_modules/.bin/vitest');
		const output = execFileSync(process.execPath, [vitest, 'run', '--config', configPath], {
			cwd: PROJECT_ROOT,
			env: { ...process.env, MONTSEL_PHASE1_TEST_DATABASE_URL: databaseUrl },
			encoding: 'utf8',
			stdio: 'inherit'
		});
		void output;
	} catch (error) {
		process.exitCode = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 1;
	} finally {
		unlinkSync(configPath);
	}
}

main();
