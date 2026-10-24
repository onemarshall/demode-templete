/**
 * Admin module remotes — public barrel.
 *
 * User administration and the security operations console.
 * Import from `#lib/remote/admin/index.js`.
 */

// User administration
export {
	listUsers,
	getUser,
	listUserSessions,
	banUser,
	unbanUser,
	setRole,
	setUserPassword,
	revokeSession,
	revokeAllSessions,
	removeUser,
	sendTestEmail,
	runDirectusPluginTest
} from './admin.remote';

// Security analytics and operations (custom SDK)
export {
	// Queries
	getDashboardMetrics,
	getSecuritySessions,
	getTrustedDevices,
	getSystemHealth,
	getLiveThreats,
	getFlaggedSessions,
	getSecurityDashboard,
	// Commands
	blockIp,
	unblockIp,
	whitelistDevice,
	dismissSession,
	clearMetricsCache
} from './security/analytics.remote';

export {
	// Queries
	getBlockedIps,
	getSecurityConfig,
	// Commands
	allowlistIp,
	removeIpFromAllowlist,
	revokeDeviceTrust,
	updateDeviceTrustLevel,
	bulkBlockThreatIps,
	createSecurityIncident,
	updateSecurityThresholds
} from './security/operations.remote';

// Security test scenarios (development/admin tooling)
export {
	getSecurityTestScenarios,
	getSecurityTestPresets,
	runSecurityTestScenario,
	injectSecurityTestEvents
} from './security/testing.remote';
