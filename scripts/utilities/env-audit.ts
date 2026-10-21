import fs from 'node:fs/promises';
import path from 'node:path';
import { readdir } from 'node:fs/promises';

/**
 * Env Audit Script
 *
 * - Lists all env variables referenced in the codebase.
 * - Flags any non-PUBLIC_ variables used in client-bundled files (page/layout components).
 * - Helps ensure server-only secrets stay server-side.
 *
 * Run:
 *   bun --bunx tsx scripts/env-audit.ts
 */

const ROOT = path.resolve(path.join(import.meta.dirname, '..'));
const CLIENT_FILE_REGEX = /\/src\/routes\/.*\+((page|layout|error)\.(svelte|ts|js))$/;
const FILE_REGEX = /\.(svelte|ts|js)$/;

const ENV_REGEX = /\b(?:import\.meta\.env|process\.env)\.([A-Z0-9_]+)/g;

async function collectFiles(dir: string, predicate: (file: string) => boolean): Promise<string[]> {
	const results: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await collectFiles(full, predicate)));
		} else if (predicate(full)) {
			results.push(full);
		}
	}
	return results;
}

function extractEnvRefs(text: string) {
	const matches = new Set<string>();
	for (const match of text.matchAll(ENV_REGEX)) {
		if (match[1]) matches.add(match[1]);
	}
	return matches;
}

async function main() {
	const allFiles = await collectFiles(path.join(ROOT, 'src'), (file) => FILE_REGEX.test(file));
	const clientFiles = allFiles.filter((file) => CLIENT_FILE_REGEX.test(file));
	const serverFiles = allFiles.filter((file) => !CLIENT_FILE_REGEX.test(file));

	const clientEnv = new Set<string>();
	const serverEnv = new Set<string>();

	for (const file of clientFiles) {
		const text = await fs.readFile(file, 'utf8');
		extractEnvRefs(text).forEach((v) => clientEnv.add(v));
	}
	for (const file of serverFiles) {
		const text = await fs.readFile(file, 'utf8');
		extractEnvRefs(text).forEach((v) => serverEnv.add(v));
	}

	const nonPublicInClient = [...clientEnv].filter((v) => !v.startsWith('PUBLIC_'));

	console.log('=== Env Audit Report ===');
	console.log(`Client files scanned: ${clientFiles.length}`);
	console.log(`Server files scanned: ${serverFiles.length}`);
	console.log(`Env in client: ${[...clientEnv].sort().join(', ') || '(none)'}`);
	console.log(`Env in server: ${[...serverEnv].sort().join(', ') || '(none)'}`);

	if (nonPublicInClient.length) {
		console.log('\n⚠️  Non-PUBLIC_ env used in client code:');
		nonPublicInClient.sort().forEach((v) => console.log(` - ${v}`));
		process.exitCode = 1;
	} else {
		console.log('\n✅ No non-PUBLIC_ env found in client code.');
	}
}

main().catch((err) => {
	console.error('Env audit failed:', err);
	process.exitCode = 1;
});
