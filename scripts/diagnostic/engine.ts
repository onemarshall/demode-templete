/**
 * Where the engine is, and how to run its CLI safely.
 *
 * The sector import proof drives the engine's own importer as a subprocess so no
 * engine file changes and the engine stays free to be frozen. That means every
 * caller needs the same two things: the engine's location, and a way to run it
 * against one database and nothing else.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { assert } from './disposable-db.ts';

export const PRODUCT_ENGINES =
	process.env.MONTSEL_PRODUCT_ENGINES ??
	resolve(homedir(), 'Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines');

export const ENGINE_DIR =
	process.env.MONTSEL_ENGINE_DIR ?? join(PRODUCT_ENGINES, 'diagnostic/app/cli');

export const RESEARCH_DIR = process.env.MONTSEL_RESEARCH_DIR ?? join(PRODUCT_ENGINES, 'research');

export function requireEngine(): string {
	assert(
		existsSync(join(ENGINE_DIR, 'src/cli.ts')),
		`No engine CLI at ${ENGINE_DIR}. Set MONTSEL_ENGINE_DIR.`
	);
	return ENGINE_DIR;
}

export interface EngineRun {
	code: number;
	out: string;
}

/**
 * Run the engine CLI against one database.
 *
 * `MONTSEL_LOAD_DOTENV=0` matters: the engine loads its own `.env` otherwise,
 * and an operator's local database URL would silently win over the disposable
 * one. Nothing here may reach the operator's stack.
 */
export function runEngine(args: string[], databaseUrl?: string): EngineRun {
	try {
		const out = execFileSync('bun', ['run', 'src/cli.ts', ...args], {
			cwd: requireEngine(),
			env: {
				...process.env,
				...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
				MONTSEL_LOAD_DOTENV: '0'
			},
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		});
		return { code: 0, out };
	} catch (error) {
		const failure = error as { status?: number; stdout?: string; stderr?: string };
		return { code: failure.status ?? -1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
	}
}

/** Compile a Sector-Intelligence-Synthesis.md into the JSON the importer reads. */
export function compileSynthesis(markdownPath: string, outPath: string): EngineRun {
	return runEngine(['compile', 'sector-synthesis', `--file=${markdownPath}`, `--out=${outPath}`]);
}
