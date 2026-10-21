/**
 * Better Auth Test Examples
 * 
 * Examples of how to use Better Auth test utilities in your test suite.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';

// Example 1: Basic Test Setup
describe('Better Auth Test Utils Examples', () => {
  let auth: any;
  let testHelpers: any;

  beforeAll(async () => {
    // Create auth instance with test utils
    auth = betterAuth({
      plugins: [
        testUtils({ captureOTP: true })
      ],
      // Add your other auth config here
      emailAndPassword: {
        enabled: true
      }
    });

    // Get test helpers from context
    const ctx = await auth.$context;
    testHelpers = ctx.test;
  });

  // Example 2: Factory Functions
  describe('Factories', () => {
    it('should create a user with defaults', () => {
      const user = testHelpers.createUser();
      expect(user.email).toMatch(/user-.*@example\.com/);
      expect(user.name).toBe('Test User');
      expect(user.emailVerified).toBe(true);
    });

    it('should create a user with overrides', () => {
      const user = testHelpers.createUser({
        email: 'alice@example.com',
        name: 'Alice',
        emailVerified: false
      });
      expect(user.email).toBe('alice@example.com');
      expect(user.name).toBe('Alice');
      expect(user.emailVerified).toBe(false);
    });
  });

  // Example 3: Database Helpers
  describe('Database Operations', () => {
    it('should save and delete a user', async () => {
      const user = testHelpers.createUser({ email: 'db-test@example.com' });
      
      // Save to database
      const savedUser = await testHelpers.saveUser(user);
      expect(savedUser.id).toBeDefined();

      // Clean up
      await testHelpers.deleteUser(savedUser.id);
    });
  });

  // Example 4: Authentication Helpers
  describe('Authentication Helpers', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = testHelpers.createUser({ email: 'auth-test@example.com' });
      await testHelpers.saveUser(testUser);
    });

    afterEach(async () => {
      await testHelpers.deleteUser(testUser.id);
    });

    it('should create authenticated session', async () => {
      const { session, user, headers, cookies, token } = await testHelpers.login({
        userId: testUser.id
      });

      expect(session.userId).toBe(testUser.id);
      expect(user.id).toBe(testUser.id);
      expect(headers).toBeDefined();
      expect(cookies).toBeDefined();
      expect(token).toBeDefined();
    });

    it('should get auth headers', async () => {
      const headers = await testHelpers.getAuthHeaders({ userId: testUser.id });
      
      // Use headers for authenticated requests
      const session = await auth.api.getSession({ headers });
      expect(session?.user.id).toBe(testUser.id);
    });

    it('should get cookies for browser testing', async () => {
      const cookies = await testHelpers.getCookies({
        userId: testUser.id,
        domain: 'localhost'
      });

      expect(cookies).toHaveLength(1);
      expect(cookies[0].name).toMatch(/session_token/);
      expect(cookies[0].domain).toBe('localhost');
    });
  });

  // Example 5: OTP Capture
  describe('OTP Capture', () => {
    beforeEach(() => {
      testHelpers.clearOTPs();
    });

    it('should capture and retrieve OTP', async () => {
      const email = 'otp-test@example.com';
      
      // Simulate sending OTP (in real tests, use your auth API)
      // await auth.api.sendVerificationOTP({ body: { email, type: 'email-verification' } });
      
      // For demonstration, manually set OTP
      testHelpers.setOTP(email, '123456');
      
      // Retrieve captured OTP
      const otp = testHelpers.getOTP(email);
      expect(otp).toBe('123456');
    });
  });
});

// Example 6: Integration Test Pattern
export function createAuthIntegrationTest() {
  describe('Protected Routes', () => {
    let auth: any;
    let testHelpers: any;

    beforeAll(async () => {
      auth = betterAuth({
        plugins: [testUtils({ captureOTP: true })],
        // Your full auth configuration here
      });
      const ctx = await auth.$context;
      testHelpers = ctx.test;
    });

    it('should allow authenticated requests', async () => {
      // Setup
      const user = testHelpers.createUser({ email: 'integration@example.com' });
      await testHelpers.saveUser(user);

      // Get authenticated headers
      const headers = await testHelpers.getAuthHeaders({ userId: user.id });

      // Test protected endpoint
      const session = await auth.api.getSession({ headers });
      expect(session?.user.id).toBe(user.id);

      // Cleanup
      await testHelpers.deleteUser(user.id);
    });
  });
}

// Example 7: E2E Test Pattern (Playwright)
export function createE2ETestPattern() {
  // This would be in your Playwright test file
  /*
  import { test, expect } from '@playwright/test';
  import { betterAuth, testUtils } from 'better-auth';

  test('dashboard shows user name', async ({ context, page }) => {
    const auth = betterAuth({
      plugins: [testUtils()]
    });
    const ctx = await auth.$context;
    const testUtils = ctx.test;

    // Create and save user
    const user = testUtils.createUser({
      email: 'e2e@example.com',
      name: 'E2E User'
    });
    await testUtils.saveUser(user);

    // Get cookies and inject into browser
    const cookies = await testUtils.getCookies({
      userId: user.id,
      domain: 'localhost'
    });
    await context.addCookies(cookies);

    // Navigate to protected page
    await page.goto('/dashboard');

    // Assert user name is visible
    await expect(page.getByText('E2E User')).toBeVisible();

    // Cleanup
    await testUtils.deleteUser(user.id);
  });
  */
}
