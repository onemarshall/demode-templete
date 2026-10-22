import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AuthMetricsPanel from '#lib/components/admin-security/AuthMetricsPanel.svelte';

const hourMs = 60 * 60 * 1000;
const now = Date.now();

// Matches the payload the SDK used to emit: every bucket stamped with the same
// timestamp. The chart must render this without a duplicate-key crash.
const duplicateTimestampRates = Array.from({ length: 24 }, (_, i) => ({
	hour: (23 - i + 24) % 24,
	timestamp: now - 24 * hourMs,
	successCount: i === 3 ? 1 : 0,
	failureCount: 0,
	successRate: 100
}));

describe('AuthMetricsPanel', () => {
	it('renders hourly buckets that share a timestamp', () => {
		render(AuthMetricsPanel, {
			authStats: {
				successCount: 1,
				failureCount: 0,
				successRate: 100,
				recentFailures: [],
				hourlyRates: duplicateTimestampRates,
				bruteForceAttempts: [],
				twoFactorAdoptionRate: 0,
				twoFactorEnabledCount: 0,
				totalUsersCount: 1,
				passwordResetRequests: 0,
				passwordResetHourly: []
			}
		});

		expect(document.body.textContent).toContain('Successful');
	});
});
