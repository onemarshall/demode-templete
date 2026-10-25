import { describe, expect, it } from 'vitest';
import { bucketByHour } from '../dashboard-analytics.js';
import type { SecurityAnalyticsEvent } from '../../analytics/index.js';

describe('bucketByHour', () => {
	it('returns 24 buckets with unique start timestamps', () => {
		const buckets = bucketByHour<{ hour: number; timestamp: number }>(
			[] as SecurityAnalyticsEvent[],
			(_hourEvents, hour, hourStart) => ({ hour, timestamp: hourStart })
		);

		expect(buckets).toHaveLength(24);
		expect(new Set(buckets.map((b) => b.timestamp)).size).toBe(24);
	});
});
