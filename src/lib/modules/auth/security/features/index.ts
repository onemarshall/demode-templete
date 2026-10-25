/**
 * Security Features Registry
 *
 * Central registry for all security features.
 * Features are sorted by priority and executed in order.
 */

import { blockingFeature } from './blocking';
import { rateLimitFeature } from './rate-limit';
import { captchaFeature } from './captcha';
import { geoFeature } from './geo';
import { deviceFeature } from './device';
import { behaviorFeature } from './behavior';
import {
	registerFeature,
	getAllFeatures,
	getEnabledFeatures,
	type SecurityFeature
} from '../core/feature';

// Register all features
const allFeatures: SecurityFeature[] = [
	blockingFeature,
	rateLimitFeature,
	captchaFeature,
	geoFeature,
	deviceFeature,
	behaviorFeature
];

// Register each feature (idempotent — safe for HMR re-registration)
for (const feature of allFeatures) {
	registerFeature(feature);
}

// Re-export features
export { blockingFeature } from './blocking';
export { rateLimitFeature } from './rate-limit';
export { captchaFeature } from './captcha';
export { geoFeature } from './geo';
export { deviceFeature } from './device';
export { behaviorFeature } from './behavior';

// Re-export feature utilities
export { getAllFeatures, getEnabledFeatures };

// Export all types
export * from './blocking/types';
export * from './rate-limit/types';
export * from './captcha/types';
export * from './geo/types';
export * from './device/types';
export * from './behavior/types';
