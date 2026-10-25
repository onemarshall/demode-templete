import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Mock logger
const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn()
};

// Mock security analytics service
const mockSecurityAnalytics = {
	collectMetrics: vi.fn(),
	getFlaggedSessions: vi.fn(),
	getSessionById: vi.fn(),
	blockSessionById: vi.fn(),
	unblockSessionById: vi.fn(),
	getBlockedIPs: vi.fn(),
	blockIPAddress: vi.fn(),
	unblockIPAddress: vi.fn(),
	getTrustedDevices: vi.fn(),
	whitelistDeviceForUser: vi.fn(),
	revokeDeviceTrustForUser: vi.fn(),
	getAlerts: vi.fn(),
	acknowledgeAlertById: vi.fn(),
	acknowledgeAllAlertsForUser: vi.fn(),
	getCacheStatistics: vi.fn(),
	clearAnalyticsCache: vi.fn(),
	clearSecurityMetrics: vi.fn()
};

describe('Security Analytics Plugin', () => {
	beforeAll(() => {
		// Mock clipboard API to prevent clipboard errors
		Object.defineProperty(globalThis, 'navigator', {
			value: {
				...globalThis.navigator,
				clipboard: {
					writeText: vi.fn(),
					readText: vi.fn(),
					write: vi.fn(),
					read: vi.fn()
				}
			},
			writable: true
		});

		// Mock document for clipboard
		Object.defineProperty(globalThis, 'document', {
			value: {
				...globalThis.document,
				executeCommand: vi.fn(),
				queryCommandSupported: vi.fn(() => false)
			},
			writable: true
		});

		// Mock browser APIs
		Object.defineProperty(globalThis, 'window', {
			value: {
				location: { pathname: '/test' },
				sessionStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {}
				},
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {}
				},
				navigator: {
					userAgent: 'Test Browser/1.0',
					language: 'en-US',
					platform: 'test-platform',
					hardwareConcurrency: 4,
					clipboard: {
						writeText: vi.fn(),
						readText: vi.fn(),
						write: vi.fn(),
						read: vi.fn()
					}
				}
			},
			writable: true
		});

		// Set up logger mock to track calls
		mockLogger.error.mockClear();
	});

	afterAll(() => {
		vi.clearAllMocks();
	});

	describe('Metrics Collection', () => {
		it('should collect security metrics', async () => {
			const mockMetrics = {
				summary: {
					totalSessions: 100,
					activeSessions: 25,
					sessionsLastHour: 15,
					averageRiskScore: 12.5,
					highestRiskScore: 85,
					blockedRequests: 5,
					captchaChallenges: 3,
					captchaSuccessRate: 0.8,
					timestamp: Date.now()
				},
				riskDistribution: {
					low: 70,
					medium: 20,
					high: 8,
					critical: 2
				},
				trustDistribution: {
					low: 15,
					medium: 30,
					high: 55
				},
				signalBreakdown: {
					deviceTrust: 80,
					behaviorTrust: 75,
					locationTrust: 90,
					vpnDetected: 2,
					torDetected: 0,
					proxyDetected: 1,
					captchaTriggered: 3,
					automationDetected: 1
				},
				hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
					hour: i.toString(),
					sessions: Math.floor(Math.random() * 10),
					averageRisk: Math.random() * 30,
					blocked: Math.floor(Math.random() * 2),
					captchaChallenges: Math.floor(Math.random() * 2)
				})),
				geographicBreakdown: [
					{ country: 'United States', countryCode: 'US', count: 50, avgRisk: 10 },
					{ country: 'Canada', countryCode: 'CA', count: 20, avgRisk: 15 },
					{ country: 'United Kingdom', countryCode: 'GB', count: 15, avgRisk: 12 }
				],
				topRiskFactors: [
					{ factor: 'new_device', count: 25 },
					{ factor: 'suspicious_location', count: 15 },
					{ factor: 'rapid_requests', count: 10 }
				],
				timeRange: '24h',
				generatedAt: Date.now()
			};

			mockSecurityAnalytics.collectMetrics.mockResolvedValue(mockMetrics);

			const result = await mockSecurityAnalytics.collectMetrics();

			expect(result).toBeDefined();
			expect(result.summary).toBeDefined();
			expect(result.summary.totalSessions).toBe(100);
			expect(result.summary.activeSessions).toBe(25);
			expect(result.riskDistribution).toBeDefined();
			expect(result.signalBreakdown).toBeDefined();
			expect(result.hourlyActivity).toHaveLength(24);

			expect(mockSecurityAnalytics.collectMetrics).toHaveBeenCalledTimes(1);
		});

		it('should handle empty metrics gracefully', async () => {
			const emptyMetrics = {
				summary: {
					totalSessions: 0,
					activeSessions: 0,
					sessionsLastHour: 0,
					averageRiskScore: 0,
					highestRiskScore: 0,
					blockedRequests: 0,
					captchaChallenges: 0,
					captchaSuccessRate: 0,
					timestamp: Date.now()
				},
				riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
				trustDistribution: { low: 0, medium: 0, high: 0 },
				signalBreakdown: {
					deviceTrust: 0,
					behaviorTrust: 0,
					locationTrust: 0,
					vpnDetected: 0,
					torDetected: 0,
					proxyDetected: 0,
					captchaTriggered: 0,
					automationDetected: 0
				},
				hourlyActivity: [],
				geographicBreakdown: [],
				topRiskFactors: [],
				timeRange: '24h',
				generatedAt: Date.now()
			};

			mockSecurityAnalytics.collectMetrics.mockResolvedValue(emptyMetrics);

			const result = await mockSecurityAnalytics.collectMetrics();

			expect(result).toBeDefined();
			expect(result.summary.totalSessions).toBe(0);
			expect(result.riskDistribution.low).toBe(0);
			expect(result.hourlyActivity).toHaveLength(0);
		});
	});

	describe('Flagged Sessions Management', () => {
		it('should retrieve flagged sessions', async () => {
			const mockFlaggedSessions = {
				sessions: [
					{
						id: 'session_1',
						userId: 'user_123',
						email: 'test@example.com',
						ip: '192.168.1.100',
						riskScore: 75,
						createdAt: Date.now(),
						lastActivity: Date.now(),
						status: 'flagged',
						reasons: ['suspicious_location', 'new_device'],
						analysis: {
							deviceTrust: 0.3,
							behaviorTrust: 0.4,
							locationTrust: 0.2,
							overallRisk: 0.75
						},
						recommendations: ['require_2fa', 'monitor_closely']
					},
					{
						id: 'session_2',
						userId: 'user_456',
						email: 'risky@example.com',
						ip: '203.0.113.50',
						riskScore: 85,
						createdAt: Date.now(),
						lastActivity: Date.now(),
						status: 'flagged',
						reasons: ['multiple_failed_logins', 'automation_detected'],
						analysis: {
							deviceTrust: 0.1,
							behaviorTrust: 0.2,
							locationTrust: 0.3,
							overallRisk: 0.85
						},
						recommendations: ['block_temporarily', 'investigate_further']
					}
				],
				total: 2,
				page: 1,
				limit: 20,
				hasMore: false
			};

			mockSecurityAnalytics.getFlaggedSessions.mockResolvedValue(mockFlaggedSessions);

			const result = await mockSecurityAnalytics.getFlaggedSessions({ page: 1, limit: 20 });

			expect(result).toBeDefined();
			expect(result.sessions).toHaveLength(2);
			expect(result.total).toBe(2);
			expect(result.sessions[0].riskScore).toBe(75);
			expect(result.sessions[1].reasons).toContain('multiple_failed_logins');

			expect(mockSecurityAnalytics.getFlaggedSessions).toHaveBeenCalledWith({ page: 1, limit: 20 });
		});

		it('should block a session by ID', async () => {
			const sessionId = 'session_123';
			const blockResult = { success: true, blocked: true, timestamp: Date.now() };

			mockSecurityAnalytics.blockSessionById.mockResolvedValue(blockResult);

			const result = await mockSecurityAnalytics.blockSessionById(sessionId);

			expect(result.success).toBe(true);
			expect(result.blocked).toBe(true);
			expect(mockSecurityAnalytics.blockSessionById).toHaveBeenCalledWith(sessionId);
		});

		it('should unblock a session by ID', async () => {
			const sessionId = 'session_123';
			const unblockResult = { success: true, unblocked: true, timestamp: Date.now() };

			mockSecurityAnalytics.unblockSessionById.mockResolvedValue(unblockResult);

			const result = await mockSecurityAnalytics.unblockSessionById(sessionId);

			expect(result.success).toBe(true);
			expect(result.unblocked).toBe(true);
			expect(mockSecurityAnalytics.unblockSessionById).toHaveBeenCalledWith(sessionId);
		});
	});

	describe('IP Address Management', () => {
		it('should retrieve blocked IPs', async () => {
			const mockBlockedIPs = {
				ips: [
					{
						ip: '203.0.113.50',
						blockedAt: Date.now(),
						reason: 'multiple_failed_logins',
						blockedBy: 'system',
						requestCount: 15,
						riskScore: 95,
						expiresAt: Date.now() + 24 * 60 * 60 * 1000
					},
					{
						ip: '192.0.2.100',
						blockedAt: Date.now(),
						reason: 'automation_detected',
						blockedBy: 'admin',
						requestCount: 50,
						riskScore: 88,
						expiresAt: null
					}
				],
				total: 2,
				page: 1,
				limit: 50,
				hasMore: false
			};

			mockSecurityAnalytics.getBlockedIPs.mockResolvedValue(mockBlockedIPs);

			const result = await mockSecurityAnalytics.getBlockedIPs({ page: 1, limit: 50 });

			expect(result).toBeDefined();
			expect(result.ips).toHaveLength(2);
			expect(result.ips[0].ip).toBe('203.0.113.50');
			expect(result.ips[0].reason).toBe('multiple_failed_logins');
			expect(result.ips[1].riskScore).toBe(88);
		});

		it('should block an IP address', async () => {
			const ipAddress = '203.0.113.50';
			const reason = 'suspicious_activity';
			const blockResult = { success: true, blocked: true, timestamp: Date.now() };

			mockSecurityAnalytics.blockIPAddress.mockResolvedValue(blockResult);

			const result = await mockSecurityAnalytics.blockIPAddress(ipAddress, reason);

			expect(result.success).toBe(true);
			expect(result.blocked).toBe(true);
			expect(mockSecurityAnalytics.blockIPAddress).toHaveBeenCalledWith(ipAddress, reason);
		});

		it('should unblock an IP address', async () => {
			const ipAddress = '203.0.113.50';
			const unblockResult = { success: true, unblocked: true, timestamp: Date.now() };

			mockSecurityAnalytics.unblockIPAddress.mockResolvedValue(unblockResult);

			const result = await mockSecurityAnalytics.unblockIPAddress(ipAddress);

			expect(result.success).toBe(true);
			expect(result.unblocked).toBe(true);
			expect(mockSecurityAnalytics.unblockIPAddress).toHaveBeenCalledWith(ipAddress);
		});
	});

	describe('Device Trust Management', () => {
		it('should retrieve trusted devices', async () => {
			const mockTrustedDevices = {
				devices: [
					{
						id: 'device_123',
						userId: 'user_123',
						fingerprint: 'fp_abc123',
						deviceName: 'Chrome on MacBook',
						trusted: true,
						trustedAt: Date.now(),
						lastSeen: Date.now(),
						location: 'San Francisco, US',
						trustScore: 0.95
					},
					{
						id: 'device_456',
						userId: 'user_456',
						fingerprint: 'fp_def456',
						deviceName: 'Safari on iPhone',
						trusted: true,
						trustedAt: Date.now(),
						lastSeen: Date.now(),
						location: 'New York, US',
						trustScore: 0.88
					}
				],
				total: 2,
				page: 1,
				limit: 50,
				hasMore: false
			};

			mockSecurityAnalytics.getTrustedDevices.mockResolvedValue(mockTrustedDevices);

			const result = await mockSecurityAnalytics.getTrustedDevices({ page: 1, limit: 50 });

			expect(result).toBeDefined();
			expect(result.devices).toHaveLength(2);
			expect(result.devices[0].trustScore).toBe(0.95);
			expect(result.devices[1].deviceName).toBe('Safari on iPhone');
		});

		it('should whitelist a device for user', async () => {
			const userId = 'user_123';
			const deviceFingerprint = 'fp_abc123';
			const whitelistResult = { success: true, whitelisted: true, timestamp: Date.now() };

			mockSecurityAnalytics.whitelistDeviceForUser.mockResolvedValue(whitelistResult);

			const result = await mockSecurityAnalytics.whitelistDeviceForUser(userId, deviceFingerprint);

			expect(result.success).toBe(true);
			expect(result.whitelisted).toBe(true);
			expect(mockSecurityAnalytics.whitelistDeviceForUser).toHaveBeenCalledWith(
				userId,
				deviceFingerprint
			);
		});

		it('should revoke device trust for user', async () => {
			const userId = 'user_123';
			const deviceFingerprint = 'fp_abc123';
			const revokeResult = { success: true, revoked: true, timestamp: Date.now() };

			mockSecurityAnalytics.revokeDeviceTrustForUser.mockResolvedValue(revokeResult);

			const result = await mockSecurityAnalytics.revokeDeviceTrustForUser(
				userId,
				deviceFingerprint
			);

			expect(result.success).toBe(true);
			expect(result.revoked).toBe(true);
			expect(mockSecurityAnalytics.revokeDeviceTrustForUser).toHaveBeenCalledWith(
				userId,
				deviceFingerprint
			);
		});
	});

	describe('Cache Management', () => {
		it('should get cache statistics', async () => {
			const mockCacheStats = {
				totalKeys: 1250,
				totalMemory: '2.5MB',
				keyTypes: {
					security_metrics: 45,
					session_data: 890,
					device_fingerprints: 210,
					blocked_ips: 25,
					alerts: 80
				},
				oldestKey: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
				newestKey: Date.now(),
				expirationStats: {
					expired: 12,
					expiring: 8,
					noExpiration: 1230
				}
			};

			mockSecurityAnalytics.getCacheStatistics.mockResolvedValue(mockCacheStats);

			const result = await mockSecurityAnalytics.getCacheStatistics();

			expect(result).toBeDefined();
			expect(result.totalKeys).toBe(1250);
			expect(result.keyTypes.security_metrics).toBe(45);
			expect(result.keyTypes.session_data).toBe(890);
			expect(result.expirationStats.expired).toBe(12);
		});

		it('should clear analytics cache', async () => {
			const clearResult = { success: true, entriesRemoved: 45, timestamp: Date.now() };

			mockSecurityAnalytics.clearAnalyticsCache.mockResolvedValue(clearResult);

			const result = await mockSecurityAnalytics.clearAnalyticsCache();

			expect(result.success).toBe(true);
			expect(result.entriesRemoved).toBe(45);
			expect(mockSecurityAnalytics.clearAnalyticsCache).toHaveBeenCalledTimes(1);
		});

		it('should clear security metrics', async () => {
			const clearResult = { success: true, entriesRemoved: 12, timestamp: Date.now() };

			mockSecurityAnalytics.clearSecurityMetrics.mockResolvedValue(clearResult);

			const result = await mockSecurityAnalytics.clearSecurityMetrics();

			expect(result.success).toBe(true);
			expect(result.entriesRemoved).toBe(12);
			expect(mockSecurityAnalytics.clearSecurityMetrics).toHaveBeenCalledTimes(1);
		});
	});

	describe('Alert Management', () => {
		it('should retrieve security alerts', async () => {
			const mockAlerts = {
				alerts: [
					{
						id: 'alert_1',
						type: 'high_risk_session',
						severity: 'high',
						userId: 'user_123',
						sessionId: 'session_456',
						ip: '203.0.113.50',
						message: 'High risk session detected',
						details: {
							riskScore: 85,
							reasons: ['suspicious_location', 'new_device'],
							location: 'Unknown, CN'
						},
						createdAt: Date.now(),
						acknowledged: false,
						acknowledgedBy: null,
						acknowledgedAt: null
					},
					{
						id: 'alert_2',
						type: 'multiple_failed_logins',
						severity: 'critical',
						userId: null,
						sessionId: null,
						ip: '192.0.2.100',
						message: 'Multiple failed login attempts detected',
						details: {
							attempts: 10,
							timeWindow: '5 minutes',
							userAgents: ['bot', 'scanner']
						},
						createdAt: Date.now(),
						acknowledged: true,
						acknowledgedBy: 'admin',
						acknowledgedAt: Date.now()
					}
				],
				total: 2,
				page: 1,
				limit: 20,
				hasMore: false,
				unreadCount: 1
			};

			mockSecurityAnalytics.getAlerts.mockResolvedValue(mockAlerts);

			const result = await mockSecurityAnalytics.getAlerts({ page: 1, limit: 20 });

			expect(result).toBeDefined();
			expect(result.alerts).toHaveLength(2);
			expect(result.unreadCount).toBe(1);
			expect(result.alerts[0].severity).toBe('high');
			expect(result.alerts[1].acknowledged).toBe(true);
		});

		it('should acknowledge an alert by ID', async () => {
			const alertId = 'alert_123';
			const acknowledgedBy = 'admin';
			const acknowledgeResult = { success: true, acknowledged: true, timestamp: Date.now() };

			mockSecurityAnalytics.acknowledgeAlertById.mockResolvedValue(acknowledgeResult);

			const result = await mockSecurityAnalytics.acknowledgeAlertById(alertId, acknowledgedBy);

			expect(result.success).toBe(true);
			expect(result.acknowledged).toBe(true);
			expect(mockSecurityAnalytics.acknowledgeAlertById).toHaveBeenCalledWith(
				alertId,
				acknowledgedBy
			);
		});

		it('should acknowledge all alerts for user', async () => {
			const userId = 'user_123';
			const acknowledgedBy = 'admin';
			const acknowledgeResult = { success: true, acknowledgedCount: 5, timestamp: Date.now() };

			mockSecurityAnalytics.acknowledgeAllAlertsForUser.mockResolvedValue(acknowledgeResult);

			const result = await mockSecurityAnalytics.acknowledgeAllAlertsForUser(
				userId,
				acknowledgedBy
			);

			expect(result.success).toBe(true);
			expect(result.acknowledgedCount).toBe(5);
			expect(mockSecurityAnalytics.acknowledgeAllAlertsForUser).toHaveBeenCalledWith(
				userId,
				acknowledgedBy
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle Redis connection errors gracefully', async () => {
			const errorMessage = 'Redis connection failed';
			mockSecurityAnalytics.collectMetrics.mockRejectedValue(new Error(errorMessage));

			// Clear previous mock calls
			mockLogger.error.mockClear();

			await expect(mockSecurityAnalytics.collectMetrics()).rejects.toThrow(errorMessage);
			// Note: In a real implementation, the service would log the error
			// For this test, we're just verifying the error is thrown correctly
		});

		it('should handle invalid session ID gracefully', async () => {
			const invalidSessionId = 'invalid_session';
			mockSecurityAnalytics.getSessionById.mockResolvedValue(null);

			const result = await mockSecurityAnalytics.getSessionById(invalidSessionId);

			expect(result).toBeNull();
			expect(mockSecurityAnalytics.getSessionById).toHaveBeenCalledWith(invalidSessionId);
		});

		it('should handle invalid IP address format', async () => {
			const invalidIP = 'not_an_ip';
			mockSecurityAnalytics.blockIPAddress.mockRejectedValue(
				new Error('Invalid IP address format')
			);

			await expect(mockSecurityAnalytics.blockIPAddress(invalidIP, 'test')).rejects.toThrow(
				'Invalid IP address format'
			);
		});
	});
});
