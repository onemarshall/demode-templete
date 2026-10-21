#!/usr/bin/env bun
/**
 * Script to generate TypeScript types from Directus schema
 * Run with: bun run scripts/generate-types.ts
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

async function main() {
	const cmsUrl = process.env.PUBLIC_CMS_URL;
	const directusToken = process.env.DIRECTUS_ADMIN_TOKEN;

	if (!cmsUrl || !directusToken) {
		console.error('Error: PUBLIC_CMS_URL and DIRECTUS_ADMIN_TOKEN must be set in .env file');
		process.exit(1);
	}

	console.log('Generating Directus types...');

	try {
		// Run the directus-sdk-typegen CLI command
		const outputPath = join(
			process.cwd(),
			'src',
			'lib',
			'core',
			'api',
			'directus',
			'types',
			'schema.ts'
		);
		// Ensure the output directory exists
		const outputDir = dirname(outputPath);
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		// Execute the CLI command with direct arguments
		const command = `npx directus-sdk-typegen --url "${cmsUrl}" --token "${directusToken}" --output "${outputPath}"`;
		console.log(`Running command: ${command}`);
		execSync(command, { stdio: 'inherit' });

		console.log(`✅ Types generated successfully at ${outputPath}`);
	} catch (error) {
		console.error('Error generating types:', error);
		process.exit(1);
	}
}

main();
