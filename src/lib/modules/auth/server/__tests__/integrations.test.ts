import { describe, expect, it, vi } from 'vitest';

describe('host auth integration contract', () => {
  it('fails closed before the host supplies its policies', async () => {
    vi.resetModules();
    const { getAuthIntegrations } = await import('../integrations');
    expect(() => getAuthIntegrations()).toThrow('Auth has not been initialized');
  });
});
