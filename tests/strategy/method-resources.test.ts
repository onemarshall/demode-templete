import { afterEach, describe, expect, it } from 'vitest';
import { loadStrategyMethod, hasStrategyMethodRelease, strategyMethodRelease } from '../../src/lib/modules/strategy/server/resources';
import { methodContentPool, methodReleaseManifests } from '../../src/lib/modules/strategy/server/system.generated';

const release73 = 'aa796a80f285b157cbb6ea7796b4a99e0cc754abe462f79647e55577afb1e663';
const oldPath = '04-Viability-Check/04-Prompt.md';
const oldHash = 'fd116ea1433ec4aebc9639ceaab10d5acc90b2c393894843b115a4e971c6ca27';
const pool = methodContentPool as Record<string, string>;
let originalOldContent: string | undefined;

afterEach(() => {
  if (originalOldContent !== undefined) pool[oldHash] = originalOldContent;
  originalOldContent = undefined;
});

describe('private Strategy method resources', () => {
  it('keeps release 73 byte-identical while exposing the new M01 release', () => {
    expect(hasStrategyMethodRelease(release73)).toBe(true);
    expect(loadStrategyMethod(oldPath, release73)).toContain('# Module 04: Viability Check Execution Prompt');
    expect(methodReleaseManifests[release73].hashes[oldPath]).toBe(oldHash);
    expect(hasStrategyMethodRelease(strategyMethodRelease)).toBe(true);
    expect(loadStrategyMethod('01-Founder-Convictions/01-Prompt.md')).toContain('# Module 01');
    expect(Object.keys(methodReleaseManifests)).toContain(release73);
  });

  it('preserves the 73- and 80-resource releases alongside M02 without falling forward', () => {
    const prior80=Object.entries(methodReleaseManifests).find(([,manifest])=>Object.keys(manifest.hashes).length===80);
    expect(prior80).toBeDefined();
    expect(Object.keys(methodReleaseManifests[release73].hashes)).toHaveLength(73);
    expect(loadStrategyMethod('01-Founder-Convictions/01-Prompt.md',prior80![0])).toContain('# Module 01');
    expect(loadStrategyMethod('02-Market-Reality-Check/02-Prompt.md')).toContain('# Module 02');
    expect(()=>loadStrategyMethod('02-Market-Reality-Check/02-Prompt.md',prior80![0])).toThrow(/unavailable/);
  });

  it('denies unknown, missing, and altered archived resources without falling forward', () => {
    expect(hasStrategyMethodRelease('unknown-release')).toBe(false);
    expect(() => loadStrategyMethod(oldPath, 'unknown-release')).toThrow(/not available/);
    expect(() => loadStrategyMethod('missing.md', release73)).toThrow(/unavailable/);
    originalOldContent = pool[oldHash];
    pool[oldHash] = 'altered archived method';
    expect(() => loadStrategyMethod(oldPath, release73)).toThrow(/integrity check failed/);
  });
});
