#!/usr/bin/env bun
/**
 * Development server script for Bun
 * This script provides additional functionality for development with Bun
 *
 * Usage: bun run scripts/dev-server.ts
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

console.log('🚀 Starting development server with Bun...');
console.log(`🔧 Using Svelte 5 with Bun's optimizations`);

// Check if the project is properly configured for Bun
function checkBunConfiguration() {
	const bunConfigExists =
		fs.existsSync(path.join(process.cwd(), 'bunfig.json')) ||
		fs.existsSync(path.join(process.cwd(), '.bunfig.toml'));

	if (!bunConfigExists) {
		console.warn(
			'⚠️  No Bun configuration found. Consider adding bunfig.json for optimal performance.'
		);
	}

	// Check package.json for Bun scripts
	try {
		const packageJson = JSON.parse(
			fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
		);
		const devScript = packageJson.scripts?.dev || '';

		if (!devScript.includes('bun')) {
			console.warn(
				'⚠️  Dev script in package.json does not use Bun explicitly. Consider updating it.'
			);
		}
	} catch (error) {
		console.error('Error reading package.json:', error);
	}
}

// Start the development server
function startDevServer() {
	console.log(`🌐 Starting server at http://${HOST}:${PORT}`);

	const devProcess = spawn('bun', ['--bun', 'vite', 'dev', '--port', PORT.toString()], {
		stdio: 'inherit',
		shell: true
	});

	devProcess.on('error', (error) => {
		console.error('Failed to start development server:', error);
		process.exit(1);
	});

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n🛑 Shutting down development server...');
		devProcess.kill('SIGINT');
		process.exit(0);
	});
}

// Run checks and start server
checkBunConfiguration();
startDevServer();
