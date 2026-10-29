import { describe, expect, test } from 'bun:test';
import { ANCHOR_KEYS, reviseEvidenceMatrix, synthesise } from '../../src/lib/modules/strategy/server/stages/m01/synthesis';
import { m01Outputs, m01Plan } from './fixtures/m01';

describe('M01 synthesis prompt quality constraints', () => {
  test('emits the existing-gate instructions without encouraging padded or invented output', async () => {
    const fixture = m01Outputs();
    let emittedSystem = '';
    await synthesise(m01Plan(), ['You: synthetic transcript only.'], '', async (system) => {
      emittedSystem = system;
      return {
        ...fixture.outputs,
        factsAnchor: [],
        publicRecordReadiness: { state: 'not-assessed', sentence: '' },
      };
    }, 'synthetic-test');

    expect(emittedSystem).toContain('existing M01 quality gates are review constraints, not permission to embellish');
    expect(emittedSystem).toContain('Aim for at least three distinct phrases in each category where the transcript genuinely provides them');
    expect(emittedSystem).toContain('A thin or incomplete bank must remain visibly thin for review');
    expect(emittedSystem).toContain('existing gate expects at least three claims with specific categorised evidence');
    expect(emittedSystem).toContain('Make it largest only when the source genuinely supports that distribution');
    expect(emittedSystem).toContain('leave the gate visibly failed');
    expect(emittedSystem).toContain('complete sentences or complete declarative thoughts, not unfinished fragments');
    expect(emittedSystem).toContain('Return concise, complete, valid JSON');
    expect(ANCHOR_KEYS).toHaveLength(7);
  });

  test('revision prompt makes evidence and boundary gates explicit while preserving valid fixture output', async () => {
    const fixture = m01Outputs();
    let emittedSystem = '';
    const revised = await reviseEvidenceMatrix(fixture.outputs.evidenceMatrix, 'Keep every supported point distinct.', m01Plan(), ['You: synthetic transcript only.'], '', async (system) => {
      emittedSystem = system;
      return { evidenceMatrix: fixture.outputs.evidenceMatrix, claimsBoundaryInputs: fixture.outputs.claimsBoundaryInputs };
    }, 'synthetic-test');

    expect(emittedSystem).toContain('existing quality gates expect at least three claims with specific categorised evidence');
    expect(emittedSystem).toContain('Can Claim to contain strictly more statements than either Must Qualify or Cannot Claim');
    expect(emittedSystem).toContain('Keep distinct supported claims distinct');
    expect(emittedSystem).toContain('Check the three list lengths before returning');
    expect(emittedSystem).toContain('preserve the accurate matrix and boundaries and leave that gate failed for review');
    expect(revised.evidenceMatrix).toEqual(fixture.outputs.evidenceMatrix);
    expect(revised.claimsBoundaryInputs).toEqual(fixture.outputs.claimsBoundaryInputs);
  });
});
