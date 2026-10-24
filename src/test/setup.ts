// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterAll, vi } from 'vitest';
import { getMigrations } from 'better-auth/db/migration';
import { auth, db } from '$test/auth';

// Safety net: ensure env vars exist for any code reading process.env directly
process.env.BETTER_DATABASE_URL ??= 'postgres://test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret';
process.env.PUBLIC_SITE_URL ??= 'http://localhost:3000';
process.env.PUBLIC_APP_NAME ??= 'test-app';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.REDIS_PASSWORD ??= 'test-redis-password';

// Mock the analytics.remote module globally to avoid SSR evaluation issues
vi.mock('#lib/remote/admin/security/analytics.remote.js', () => ({
	getDashboardMetrics: vi.fn(),
	getSecuritySessions: vi.fn(),
	getTrustedDevices: vi.fn(),
	getSystemHealth: vi.fn(),
	getLiveThreats: vi.fn(),
	getFlaggedSessions: vi.fn(),
	getSecurityDashboard: vi.fn(),
	blockIp: vi.fn(),
	unblockIp: vi.fn(),
	whitelistDevice: vi.fn(),
	dismissSession: vi.fn(),
	clearMetricsCache: vi.fn(),
}));

beforeAll(async () => {
	// Create Better Auth tables in the in-memory SQLite DB
	const { runMigrations } = await getMigrations(auth.options);
	await runMigrations();
});

afterAll(() => {
	db.close();
});
