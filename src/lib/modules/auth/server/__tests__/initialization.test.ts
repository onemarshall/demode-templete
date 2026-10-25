import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthIntegrations } from '../integrations';

const mocks = vi.hoisted(() => ({ env: vi.fn(), build: vi.fn(), email: vi.fn() }));
vi.mock('better-auth', () => ({ betterAuth: mocks.build }));
vi.mock('better-auth/plugins', () => ({ testUtils: () => ({ id: 'test-utils' }) }));
vi.mock('#lib/platform/config/server.server.js', () => ({ getServerEnv: mocks.env }));
vi.mock('../email', () => ({ initializeEmail: mocks.email, getEmailVerificationConfig: () => ({}), getEmailAndPasswordConfig: () => ({}) }));
vi.mock('../../features/core', () => ({ buildCorePlugins: () => [] }));
vi.mock('../plugins/security', () => ({ buildSecurityPlugins: () => [] }));
vi.mock('../plugins/cms', () => ({ buildCMSPlugin: async () => null }));
vi.mock('../options/database', () => ({ getDatabaseOptions: async () => ({}) }));
vi.mock('../options/user', () => ({ getUserOptions: () => ({}) }));
vi.mock('../options/socials', () => ({ getSocialProviders: async () => ({}) }));
vi.mock('../options/databaseHooks', () => ({ databaseHooks: {} }));
vi.mock('../deletion-policy', () => ({ accountDeletionPolicyPlugin: { id: 'deletion' } }));
vi.mock('../account-unlink-policy', () => ({ accountUnlinkPolicyPlugin: { id: 'unlink' } }));
vi.mock('../plugins/history', () => ({ historyPlugin: () => ({ id: 'history' }) }));

function policies(): AuthIntegrations {
  return {
    loadDeletionSubscriptions: async () => [],
    assertNoRetainedMemberships: async () => {},
    loadExportSubscriptions: async () => [],
    organizationHooks: {},
    additionalPlugins: vi.fn(() => []),
    getDashboardSystemHealth: async () => null,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.env.mockResolvedValue({ PUBLIC_SITE_URL: 'http://localhost' });
  mocks.email.mockResolvedValue(undefined);
  mocks.build.mockReturnValue({ api: {} });
});

describe('process-scoped auth initialization', () => {
  it('shares initialization and the first host policies across concurrent and later callers', async () => {
    const module = await import('../config');
    const first = policies();
    const second = policies();
    const pending = module.initializeAuth(first);
    expect(module.initializeAuth(second)).toBe(pending);
    const instance = await pending;
    expect(module.auth).toBe(instance);
    expect(module.initializeAuth(second)).toBe(pending);
    expect(mocks.build).toHaveBeenCalledOnce();
    expect(mocks.email).toHaveBeenCalledOnce();
    expect(first.additionalPlugins).toHaveBeenCalledOnce();
    expect(second.additionalPlugins).not.toHaveBeenCalled();
    const { getAuthIntegrations } = await import('../integrations');
    expect(getAuthIntegrations()).toBe(first);
  });

  it('retains startup rejection so partially initialized state cannot be retried', async () => {
    const failure = new Error('Invalid host configuration');
    mocks.env.mockRejectedValue(failure);
    const module = await import('../config');
    const pending = module.initializeAuth(policies());
    await expect(pending).rejects.toBe(failure);
    expect(module.initializeAuth(policies())).toBe(pending);
    await expect(module.initializeAuth(policies())).rejects.toBe(failure);
    expect(mocks.env).toHaveBeenCalledOnce();
    expect(mocks.build).not.toHaveBeenCalled();
    expect(module.auth).toBeUndefined();
  });
});
