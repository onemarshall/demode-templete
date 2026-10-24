/**
 * Security Test Scenario Remote Functions
 *
 * Replaces /api/admin/security/scenarios and /api/admin/security/scenarios/inject
 * with type-safe remote functions. Development/admin-only tooling for
 * exercising the security plugin's analytics panels.
 */

import { query, command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { auth } from "#lib/auth/server/config.js";
import { isAdminUser, type SessionUser } from "#lib/auth/server/auth-helpers.js";
import { isDevelopment } from "#lib/auth/shared/env/index.js";
import { logger } from "#lib/auth/shared/logger.js";
import { getDefaultCollector } from "#lib/auth/security/analytics/index.js";
import { createSecurityContext } from "#lib/auth/security/core/context.js";
import type { SecurityContext } from "#lib/auth/security/core/context.js";
import type { RiskFactor, RiskLevel } from "#lib/auth/security/core/risk-engine.js";

interface TestEvent {
  type?: string;
  userId?: string;
  sessionId?: string;
  success?: boolean;
  factors?: RiskFactor[];
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  blocked?: boolean;
  captchaRequired?: boolean;
  rateLimited?: boolean;
  metadata?: Record<string, unknown>;
}

// Test scenarios for security plugin
const TEST_SCENARIOS: Record<
  string,
  {
    ip?: string;
    country?: string;
    distance?: number;
    userAgent?: string;
    count?: number;
    interval?: number;
    hours?: number;
    pattern?: string;
    description: string;
  }
> = {
  // IP-based scenarios
  vpn_ip: { ip: "8.8.8.8", description: "VPN/Proxy IP (Google DNS)" },
  tor_ip: { ip: "185.220.101.182", description: "Tor exit node" },
  datacenter_ip: { ip: "3.93.0.0", description: "AWS datacenter IP" },
  malicious_ip: { ip: "192.168.1.100", description: "Known malicious IP" },

  // Location scenarios
  suspicious_location: { country: "CN", description: "Suspicious country" },
  new_location: { distance: 5000, description: "Impossible travel (5000km in 1min)" },

  // Device scenarios
  new_device: { userAgent: "NewBot/1.0", description: "Unknown device fingerprint" },
  bot_device: { userAgent: "curl/7.68.0", description: "Bot/crawler user agent" },

  // Behavior scenarios
  rapid_requests: { count: 1, interval: 1000, description: "Single rate-limited request event" },
  failed_logins: { count: 1, description: "Single failed login event" },
  mouse_bot: { pattern: "linear", description: "Linear mouse movement (bot-like)" },

  // Session scenarios
  concurrent_sessions: { count: 1, description: "Single session anomaly event" },
  long_session: { hours: 24, description: "24+ hour session" },

  // Panel coverage scenarios
  password_reset: { description: "Password reset request event" },
  trusted_device: { description: "Low-risk trusted device login" },
  api_key_usage: { description: "API key authenticated request" },
};

async function ensureTestAccess(): Promise<void> {
  const isTestRuntime = process.env.NODE_ENV === "test";
  if (!isDevelopment() && !isTestRuntime) {
    error(404, "Not found");
  }

  const { request } = getRequestEvent();
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user as SessionUser | undefined;
  if (!user || !isAdminUser(user)) {
    error(403, "Admin access required");
  }
}

function getInstructions(scenario: string, testScenario: Record<string, unknown>): string {
  switch (scenario) {
    case "vpn_ip":
    case "tor_ip":
    case "datacenter_ip":
    case "malicious_ip":
      return `Make a request from IP ${testScenario.ip as string} to trigger IP intelligence checks`;

    case "rapid_requests":
      return `Inject ${testScenario.count as number} rate-limited request event (${testScenario.interval as number}ms window metadata)`;

    case "failed_logins":
      return `Inject ${testScenario.count as number} failed login event`;

    case "new_device":
      return `Use user agent "${testScenario.userAgent as string}" to trigger new device detection`;

    case "password_reset":
      return "Trigger one password reset request event for the auth metrics panel";

    case "trusted_device":
      return "Trigger one low-risk authenticated request to populate trusted device metrics";

    case "api_key_usage":
      return "Trigger one API request tagged with an API key ID for API Security panel coverage";

    default:
      return "Follow the scenario description to trigger the security event";
  }
}

// ============================================
// Queries
// ============================================

/**
 * List the available test scenarios with usage instructions.
 * Replaces: GET /api/admin/security/scenarios
 */
export const getSecurityTestScenarios = query(async () => {
  await ensureTestAccess();

  return {
    available: Object.entries(TEST_SCENARIOS).map(([name, s]) => ({
      name,
      description: s.description,
      instructions: getInstructions(name, s as Record<string, unknown>),
    })),
  };
});

/**
 * Predefined test event sets.
 * Replaces: GET /api/admin/security/scenarios/inject
 */
export const getSecurityTestPresets = query(async () => {
  await ensureTestAccess();

  const presets: Record<string, TestEvent[]> = {
    brute_force: [
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
    ],
    suspicious_ip: [
      {
        type: "auth_success",
        ip: "192.168.1.100",
        factors: [
          { source: "geo", factor: "vpn_detected", score: 30 },
          { source: "device", factor: "new_device", score: 20 },
        ],
        metadata: { country: "CN", asn: "Unknown" },
      },
    ],
    bot_behavior: [
      {
        type: "auth_success",
        userAgent: "curl/7.68.0",
        factors: [
          { source: "behavior", factor: "bot_detected", score: 40 },
          { source: "behavior", factor: "no_mouse_movement", score: 20 },
        ],
        metadata: { requestPattern: "linear" },
      },
    ],
    mixed_threats: [
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_failure",
        success: false,
        factors: [{ source: "auth", factor: "invalid_password", score: 10 }],
      },
      {
        type: "auth_success",
        ip: "185.220.101.182",
        factors: [
          { source: "geo", factor: "tor_detected", score: 50 },
          { source: "device", factor: "new_device", score: 20 },
        ],
        metadata: { country: "Unknown" },
      },
      {
        type: "blocked",
        factors: [{ source: "rate_limit", factor: "rate_limit_exceeded", score: 60 }],
      },
    ],
  };

  return { presets };
});

// ============================================
// Commands
// ============================================

const runScenarioSchema = z.object({
  scenario: z.string().min(1),
  action: z.enum(["simulate", "inject"]).default("simulate"),
  userId: z.string().min(1).max(200).optional(),
});

/**
 * Simulate or inject a named test scenario.
 * Replaces: POST /api/admin/security/scenarios?scenario=<name>&action=<simulate|inject>
 */
export const runSecurityTestScenario = command(
  runScenarioSchema,
  async ({ scenario, action, userId }) => {
    const { request, getClientAddress } = getRequestEvent();
    await ensureTestAccess();

    const testScenario = TEST_SCENARIOS[scenario];
    if (!testScenario) error(400, "Invalid scenario");

    const clientIP = getClientAddress();

    if (action === "simulate") {
      // Simulate the security event based on scenario
      const simulatedData = await simulateSecurityEvent(scenario, testScenario, clientIP, request);

      logger.info("Security test event simulated", { scenario, simulatedData });

      return {
        success: true,
        scenario,
        simulatedData,
        message: `Test scenario "${testScenario.description}" simulated successfully`,
      };
    }

    // Create test events based on scenario
    const events = createTestEvents(scenario, testScenario);
    const injectionResult = await injectEvents(events, userId ?? "test-user", clientIP, request);

    logger.info("Test scenario triggered", {
      scenario,
      eventCount: events.length,
      injected: injectionResult.injected,
    });

    return {
      success: true,
      scenario,
      injected: injectionResult.injected,
      message: `Test scenario "${testScenario.description}" triggered successfully`,
      events: events.map((e) => ({
        type: e.type,
        ip: e.ip,
        factors: e.factors?.map((f) => `${f.source}:${f.factor}`) || [],
      })),
    };
  },
);

const injectEventsSchema = z.object({
  events: z.array(z.custom<TestEvent>()).min(1),
  userId: z.string().min(1).optional(),
});

/**
 * Inject raw test events into the security analytics collector.
 * Replaces: POST /api/admin/security/scenarios/inject
 */
export const injectSecurityTestEvents = command(injectEventsSchema, async ({ events, userId }) => {
  const { request, getClientAddress } = getRequestEvent();
  await ensureTestAccess();

  const result = await injectEvents(events, userId ?? "test-user", getClientAddress(), request);
  return result;
});

// ============================================
// Helpers
// ============================================

async function injectEvents(
  events: TestEvent[],
  userId: string = "test-user",
  clientIP?: string,
  request?: Request,
) {
  const collector = getDefaultCollector();
  const ip = clientIP || "127.0.0.1";
  const req = request || new Request("http://localhost/security-test/inject");

  // Inject test events
  for (const eventData of events) {
    const eventUserId = eventData.userId ?? userId;
    const eventPath =
      typeof eventData.path === "string" && eventData.path.startsWith("/")
        ? eventData.path
        : "/security-test/inject";
    const eventMethod = eventData.method ?? "POST";

    // Create a mock request with custom headers for testing
    const mockRequest = new Request(`http://localhost${eventPath}`, {
      method: eventMethod,
      headers: {
        "User-Agent": eventData.userAgent || req.headers.get("user-agent") || "Test Agent",
        "X-Forwarded-For": eventData.ip || ip,
        "X-Test-Event": "true",
        "X-Test-User-Id": eventUserId,
        "X-Test-Session-Id": eventData.sessionId ?? "",
      },
    });

    // Create SecurityContext from the mock request
    const ctx: SecurityContext = createSecurityContext(mockRequest);

    // Override some values for testing
    if (eventUserId) ctx.userId = eventUserId;
    if (eventData.sessionId) ctx.sessionId = eventData.sessionId;
    if (eventData.factors) ctx.riskFactors = eventData.factors;
    if (typeof eventData.riskScore === "number") {
      ctx.riskScore = eventData.riskScore;
    } else if (eventData.factors && eventData.factors.length > 0) {
      ctx.riskScore = eventData.factors.reduce((sum, factor) => sum + factor.score, 0);
    }
    if (eventData.riskLevel) ctx.riskLevel = eventData.riskLevel;
    if (typeof eventData.blocked === "boolean") ctx.blocked = eventData.blocked;
    if (typeof eventData.captchaRequired === "boolean")
      ctx.captchaRequired = eventData.captchaRequired;
    if (typeof eventData.rateLimited === "boolean") ctx.rateLimited = eventData.rateLimited;

    // Record the event with the collector
    await collector.recordEvent(ctx, eventData.type || "auth_success", {
      ...eventData.metadata,
      test: true,
      injectedAt: new Date().toISOString(),
      success: eventData.success ?? true,
      sessionId: eventData.sessionId,
      path: eventPath,
      method: eventMethod,
    });
  }

  return {
    success: true,
    injected: events.length,
    message: `Successfully injected ${events.length} test events`,
  };
}

function createTestEvents(scenario: string, testScenario: Record<string, unknown>): TestEvent[] {
  switch (scenario) {
    case "vpn_ip":
      return [
        {
          type: "auth_success",
          ip: testScenario.ip as string,
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "vpn-session-1",
          riskScore: 58,
          riskLevel: "high",
          factors: [
            {
              source: "geo",
              factor: "vpn_detected",
              score: 30,
            },
            { source: "device", factor: "new_device", score: 20 },
          ],
          metadata: { panel: ["IP Intelligence", "Threat Feed"] },
        },
      ];

    case "password_reset":
      return [
        {
          type: "password_reset",
          ip: "203.0.113.200",
          path: "/auth/forgot-password",
          method: "POST",
          sessionId: "password-reset-1",
          riskScore: 18,
          riskLevel: "low",
          factors: [{ source: "auth", factor: "password_reset_requested", score: 8 }],
          metadata: { panel: ["Authentication Metrics"] },
        },
      ];

    case "trusted_device":
      return [
        {
          type: "auth_success",
          ip: "203.0.113.88",
          userId: "trusted-user-1",
          path: "/dashboard",
          method: "GET",
          sessionId: "trusted-session-1",
          riskScore: 12,
          riskLevel: "low",
          factors: [{ source: "device", factor: "known_device", score: 5 }],
          metadata: { panel: ["Trusted Devices", "Overview"] },
        },
      ];

    case "api_key_usage":
      return [
        {
          type: "auth_success",
          ip: "198.51.100.45",
          path: "/api/internal/reporting",
          method: "POST",
          sessionId: "api-key-session-1",
          riskScore: 36,
          riskLevel: "medium",
          factors: [{ source: "api", factor: "api_key_authenticated", score: 15 }],
          metadata: {
            apiKeyId: "test_api_key_alpha",
            panel: ["API Security"],
          },
        },
      ];

    case "tor_ip":
      return [
        {
          type: "auth_success",
          ip: testScenario.ip as string,
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "tor-session-1",
          riskScore: 82,
          riskLevel: "critical",
          factors: [
            { source: "geo", factor: "tor_detected", score: 50 },
            { source: "device", factor: "new_device", score: 20 },
          ],
          metadata: { panel: ["IP Intelligence", "Threat Feed", "Top Risk Factors"] },
        },
      ];

    case "datacenter_ip":
      return [
        {
          type: "auth_success",
          ip: testScenario.ip as string,
          path: "/api/auth/session",
          method: "GET",
          sessionId: "dc-session-1",
          riskScore: 32,
          riskLevel: "medium",
          factors: [
            { source: "geo", factor: "datacenter_detected", score: 15 },
            { source: "device", factor: "new_device", score: 15 },
          ],
          metadata: { panel: ["API Security", "IP Intelligence"] },
        },
      ];

    case "malicious_ip":
      return [
        {
          type: "blocked",
          ip: testScenario.ip as string,
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "malicious-session-1",
          riskScore: 95,
          riskLevel: "critical",
          blocked: true,
          factors: [
            { source: "geo", factor: "malicious_ip", score: 50 },
            { source: "abuse", factor: "known_bad_actor", score: 40 },
          ],
          metadata: { panel: ["Threat Feed", "Top Risk Factors", "IP Intelligence"] },
        },
      ];

    case "new_device":
      return [
        {
          type: "auth_success",
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "new-device-session",
          riskScore: 48,
          riskLevel: "medium",
          factors: [
            { source: "device", factor: "new_device", score: 30 },
            { source: "behavior", factor: "first_seen_device", score: 18 },
          ],
          metadata: { panel: ["Trusted Devices", "User Risk Profiles"] },
        },
      ];

    case "bot_device":
      return [
        {
          type: "auth_success",
          userAgent: testScenario.userAgent as string,
          path: "/api/auth/session",
          method: "GET",
          riskScore: 74,
          riskLevel: "high",
          rateLimited: true,
          factors: [
            { source: "device", factor: "bot_detected", score: 40 },
            { source: "behavior", factor: "non_human_pattern", score: 25 },
          ],
          metadata: { panel: ["Rate Limit Stats", "API Security"] },
        },
      ];

    case "rapid_requests":
      return [
        {
          type: "rate_limited",
          ip: "203.0.113.44",
          path: "/api/auth/session",
          method: "GET",
          sessionId: "rapid-1",
          riskScore: 76,
          riskLevel: "high",
          rateLimited: true,
          factors: [{ source: "rate_limit", factor: "high_frequency", score: 35 }],
          metadata: { panel: ["Rate Limit Stats", "API Security"] },
        },
      ];

    case "failed_logins":
      return [
        {
          type: "auth_failure",
          ip: "198.51.100.99",
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "failed-login-1",
          success: false,
          riskScore: 62,
          riskLevel: "high",
          factors: [{ source: "auth", factor: "invalid_password", score: 20 }],
          metadata: { panel: ["Authentication Metrics", "Threat Feed"] },
        },
      ];

    case "mouse_bot":
      return [
        {
          type: "auth_success",
          path: "/api/auth/session",
          method: "POST",
          sessionId: "mouse-bot-1",
          riskScore: 58,
          riskLevel: "high",
          factors: [
            { source: "behavior", factor: "bot_like_behavior", score: 30 },
            { source: "behavior", factor: "unnatural_movement", score: 20 },
          ],
          metadata: { panel: ["Time Analysis", "Top Risk Factors"] },
        },
      ];

    case "suspicious_location":
      return [
        {
          type: "auth_success",
          ip: "102.89.22.5",
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "geo-session-1",
          riskScore: 57,
          riskLevel: "high",
          factors: [
            { source: "geo", factor: "high_risk_country", score: 35 },
            { source: "geo", factor: "new_location", score: 20 },
          ],
          metadata: {
            country: testScenario.country,
            panel: ["Geographic Breakdown", "IP Intelligence"],
          },
        },
      ];

    case "new_location":
      return [
        {
          type: "auth_success",
          ip: "203.0.113.51",
          path: "/auth/sign-in",
          method: "POST",
          sessionId: "travel-session-1",
          riskScore: 88,
          riskLevel: "critical",
          factors: [
            { source: "geo", factor: "impossible_travel", score: 45 },
            { source: "session", factor: "session_hijack_suspected", score: 35 },
          ],
          metadata: { distance: testScenario.distance, panel: ["Threat Feed", "Time Analysis"] },
        },
      ];

    case "concurrent_sessions":
      return [
        {
          type: "auth_success",
          ip: "198.51.100.77",
          userId: "test-user-concurrent",
          path: "/dashboard",
          method: "GET",
          sessionId: "concurrent-session-1",
          riskScore: 40,
          riskLevel: "medium",
          factors: [{ source: "session", factor: "multiple_sessions", score: 20 }],
          metadata: {
            concurrentSessionCount: 3,
            panel: ["Session Analytics"],
          },
        },
      ];

    case "long_session":
      return [
        {
          type: "auth_success",
          userId: "test-user-long-session",
          ip: "203.0.113.20",
          path: "/dashboard",
          method: "GET",
          sessionId: "long-session-1",
          riskScore: 33,
          riskLevel: "medium",
          factors: [{ source: "session", factor: "extended_session", score: 18 }],
          metadata: {
            sessionDurationMs: Number(testScenario.hours) * 60 * 60 * 1000,
            invalidationReason: "Session timeout",
            panel: ["Session Analytics"],
          },
        },
      ];

    default:
      return [
        {
          type: "auth_success",
          path: "/security-test",
          method: "POST",
          riskScore: 20,
          riskLevel: "low",
          factors: [{ source: "test", factor: scenario, score: 20 }],
          metadata: { panel: ["Overview"] },
        },
      ];
  }
}

async function simulateSecurityEvent(
  scenario: string,
  testScenario: Record<string, unknown>,
  clientIP: string,
  request: Request,
) {
  const baseData = {
    timestamp: new Date().toISOString(),
    ip: scenario.includes("_ip") ? (testScenario.ip as string) : clientIP,
    userAgent: (testScenario.userAgent as string) || request.headers.get("user-agent"),
    scenario,
  };

  switch (scenario) {
    case "vpn_ip":
    case "tor_ip":
    case "datacenter_ip":
    case "malicious_ip":
      return {
        ...baseData,
        type: "ip_intelligence",
        riskFactors: ["suspicious_ip", (testScenario.description as string).toLowerCase()],
        simulatedHeaders: {
          "X-Forwarded-For": testScenario.ip as string,
          "X-Real-IP": testScenario.ip as string,
        },
      };

    case "rapid_requests":
      return {
        ...baseData,
        type: "rate_limit",
        requestCount: testScenario.count as number,
        timeWindow: testScenario.interval as number,
        riskFactors: ["high_frequency_requests", "potential_bot"],
      };

    case "failed_logins":
      return {
        ...baseData,
        type: "brute_force",
        failedAttempts: testScenario.count as number,
        riskFactors: ["multiple_failed_attempts", "potential_attack"],
      };

    case "new_device":
    case "bot_device":
      return {
        ...baseData,
        type: "device_analysis",
        deviceFingerprint: generateDeviceFingerprint(testScenario.userAgent as string),
        riskFactors: ["unknown_device", "suspicious_user_agent"],
      };

    case "suspicious_location":
      return {
        ...baseData,
        type: "geo_analysis",
        location: {
          country: testScenario.country as string,
          city: "Unknown",
        },
        riskFactors: ["suspicious_location", "high_risk_country"],
      };

    case "new_location":
      return {
        ...baseData,
        type: "impossible_travel",
        distance: testScenario.distance as number,
        timeDelta: 60, // seconds
        riskFactors: ["impossible_travel", "session_hijack_suspected"],
      };

    case "mouse_bot":
      return {
        ...baseData,
        type: "behavior_analysis",
        mousePattern: testScenario.pattern as string,
        riskFactors: ["bot_like_behavior", "unnatural_movement"],
      };

    case "concurrent_sessions":
      return {
        ...baseData,
        type: "session_anomaly",
        concurrentSessions: testScenario.count as number,
        riskFactors: ["multiple_sessions", "potential_account_sharing"],
      };

    case "long_session":
      return {
        ...baseData,
        type: "session_anomaly",
        sessionDuration: (testScenario.hours as number) * 3600, // seconds
        riskFactors: ["extended_session", "session_fixation_risk"],
      };

    default:
      return {
        ...baseData,
        type: "generic",
        riskFactors: ["test_scenario"],
      };
  }
}

function generateDeviceFingerprint(userAgent: string): string {
  // Simple hash for demo - in real implementation this would be more complex
  return btoa(userAgent + Date.now()).substring(0, 32);
}
