import { createHash } from "node:crypto";
import {
  GATE_IDS,
  type Audience,
  type Character,
  type Checks,
  type CheckFinding,
  type Expression,
  type Identity,
  type Inheritance,
  type M05Session,
  type Packet,
  type Semantic,
  type Synthesis,
} from "./contracts";
import { inheritanceProblems } from "./meaning";
import { semanticProblems } from "./semantic";
import { packetProblems } from "./decisions";
import { renderStrategy } from "./render";

export const hashM05 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export type GateResult = {
  id: (typeof GATE_IDS)[number];
  result: "pass" | "fail" | "unassessed";
  basis: string;
  findings: CheckFinding[];
};

const f = (code: string, message: string, ref = ""): CheckFinding => ({ code, message, ref });
const gate = (id: GateResult["id"], findings: CheckFinding[]): GateResult => ({
  id,
  result: findings.length ? "fail" : "pass",
  basis: findings.length ? `${findings.length} finding(s)` : "All mechanical checks passed.",
  findings,
});

function gate0(s: M05Session): GateResult {
  const findings: CheckFinding[] = [];
  const inheritance = s.data.inheritance as Inheritance | undefined;
  if (!s.confirmations.inheritance || !inheritance)
    return gate("gate-0-pre-suite", [f("phase0-missing", "Phase 0 inheritance is not confirmed.")]);
  for (const problem of inheritanceProblems(inheritance))
    findings.push(f("phase0-problem", problem, "inheritance"));
  return gate("gate-0-pre-suite", findings);
}

function gate1(s: M05Session): GateResult {
  const findings: CheckFinding[] = [];
  const identity = s.data.identity as Identity | undefined;
  const inheritance = s.data.inheritance as Inheritance | undefined;
  if (!s.confirmations.identity || !identity)
    return gate("gate-1-core-identity", [f("identity-missing", "Identity stage is not confirmed.")]);
  if (
    inheritance &&
    (identity.beliefShift.from !== inheritance.journey.from ||
      identity.beliefShift.to !== inheritance.journey.to)
  )
    findings.push(
      f("shift-rewritten", "Belief Shift FROM/TO differs from the Module 03 verbatim wording.", "beliefShift"),
    );
  if (!identity.purpose.competitorTest.trim())
    findings.push(f("purpose-no-test", "Purpose lacks its competitor test.", "purpose"));
  if (identity.values.some((value) => !value.behaviourEvidence.trim() || !value.rejects.trim()))
    findings.push(f("values-thin", "Every value needs evidence of behaviour and a real rejection.", "values"));
  for (const belief of identity.brandBeliefs)
    if (!belief.evidenceOrStanding.trim())
      findings.push(
        f("belief-no-standing", `Brand belief "${belief.statement.slice(0, 40)}…" has no evidence or standing recorded.`, "beliefs"),
      );
  if (identity.vision.horizons.some((horizon) => !horizon.proofMilestone.trim()))
    findings.push(f("vision-no-proof", "Every vision horizon needs a proof milestone, not aspiration.", "vision"));
  return gate("gate-1-core-identity", findings);
}

function gate2(s: M05Session): GateResult {
  const findings: CheckFinding[] = [];
  const audience = s.data.audience as Audience | undefined;
  if (!s.confirmations.audience || !audience)
    return gate("gate-2-audience", [f("audience-missing", "Audience stage is not confirmed.")]);
  const primary = audience.primary;
  for (const [name, value] of [
    ["currentBelief", primary.currentBelief],
    ["beliefOrigin", primary.beliefOrigin],
    ["costOfBelief", primary.costOfBelief],
    ["beliefTrigger", primary.beliefTrigger],
    ["desiredBelief", primary.desiredBelief],
  ] as const)
    if (!value.trim())
      findings.push(f("belief-profile-gap", `Primary audience belief profile is missing ${name}.`, "primary"));
  if (!audience.antiAudience.opposedBelief.trim() || !audience.antiAudience.refusalBoundary.trim())
    findings.push(f("anti-audience-thin", "Anti-audience needs the opposed belief and the refusal boundary.", "antiAudience"));
  if (audience.journeyMap.some((row) => !row.experience.trim() || !row.movesForward.trim()))
    findings.push(f("journey-incomplete", "Every journey stage needs the experience and what moves them forward.", "journeyMap"));
  return gate("gate-2-audience", findings);
}

function gate3(s: M05Session): GateResult {
  const findings: CheckFinding[] = [];
  const character = s.data.character as Character | undefined;
  if (!s.confirmations.character || !character)
    return gate("gate-3-expression-foundation", [f("character-missing", "Character stage is not confirmed.")]);
  for (const attribute of character.voice.attributes)
    if (!attribute.beliefConnection.trim())
      findings.push(f("voice-no-belief", `Voice attribute "${attribute.attribute}" has no belief connection.`, "voice"));
  for (const trait of character.personality.traits)
    if (trait.oppositeBeliefCouldClaim)
      findings.push(f("trait-claimable", `Trait "${trait.trait}" could be claimed by an opposite-belief brand.`, "personality"));
  if (character.awareness.levels.some((level) => !level.evidence.trim()))
    findings.push(f("awareness-no-evidence", "Every awareness level needs the evidence basis for its estimate.", "awareness"));
  if (character.attributes.xFactor.competitorFriction.length < 2)
    findings.push(f("xfactor-friction", "X-Factor needs at least two specific competitor-friction elements.", "attributes"));
  const tiers = new Set(character.attributes.mapping.map((row) => row.tier));
  for (const tier of ["conviction", "value", "capability", "table-stakes"] as const)
    if (!tiers.has(tier)) findings.push(f("tier-empty", `Attribute mapping has no "${tier}" tier entry.`, "attributes"));
  if (!character.attributes.wholeDistinction.reason.trim())
    findings.push(f("distinction-no-verdict", "Whole-distinction needs its verdict reason.", "attributes"));
  return gate("gate-3-expression-foundation", findings);
}

function gate4(s: M05Session): GateResult {
  const findings: CheckFinding[] = [];
  const expression = s.data.expression as Expression | undefined;
  if (!s.confirmations.expression || !expression)
    return gate("gate-4-expression-application", [f("expression-missing", "Expression stage is not confirmed.")]);
  for (const check of [...expression.filter.beliefChecks, ...expression.filter.audienceChecks])
    if (!check.test.trim()) findings.push(f("filter-check-empty", `Filter check "${check.check}" has no test.`, "filter"));
  for (const refusal of expression.filter.refusals)
    if (!refusal.note.trim()) findings.push(f("filter-refusal-empty", `Filter refusal "${refusal.refusal}" has no note.`, "filter"));
  if (expression.tagline.state === "established") {
    if (!expression.tagline.primary.trim()) findings.push(f("tagline-empty", "Established tagline has no text.", "tagline"));
    if (expression.tagline.alternatives.length < 2)
      findings.push(f("tagline-alternatives", "Established tagline needs at least two context alternatives.", "tagline"));
    if (expression.tagline.claimsStatus === "not-assessed")
      findings.push(f("tagline-claims", "Established tagline needs claims status assessed.", "tagline"));
  }
  if (expression.tagline.state === "deferred" && !expression.tagline.deferredReason.trim())
    findings.push(f("tagline-no-reason", "Deferred tagline needs its authorised reason.", "tagline"));
  if (expression.visual.neverDo.length < 4)
    findings.push(f("visual-boundaries", "Visual direction needs at least four never-do restrictions.", "visual"));
  for (const move of expression.copywriting.moves)
    if (!move.example.trim()) findings.push(f("copy-no-example", `Copy move "${move.name}" has no example.`, "copywriting"));
  return gate("gate-4-expression-application", findings);
}

function gate5(s: M05Session): GateResult {
  const findings: CheckFinding[] = [];
  const synthesis = s.data.synthesis as Synthesis | undefined;
  if (!s.confirmations.synthesis || !synthesis)
    return gate("gate-5-synthesis", [f("synthesis-missing", "Synthesis stage is not confirmed.")]);
  for (const beat of synthesis.story) {
    if (!beat.beliefAtThisMoment.trim())
      findings.push(f("beat-no-belief", `Story beat "${beat.beat}" has no visible belief.`, "story"));
    if (!beat.sourceRefs.length)
      findings.push(f("beat-no-source", `Story beat "${beat.beat}" has no source references.`, "story"));
  }
  if (
    !synthesis.core.positioningStatement.trim() ||
    !synthesis.core.organisingIdea.trim() ||
    !synthesis.core.decisionSummary.trim()
  )
    findings.push(f("core-incomplete", "The strategy core needs positioning, organising idea and decision summary.", "core"));
  if (!synthesis.traceability.length)
    findings.push(f("no-trace", "Synthesis carries no traceability rows.", "synthesis"));
  return gate("gate-5-synthesis", findings);
}

function gate6(s: M05Session, coverage: Checks["coverage"]): GateResult {
  const findings: CheckFinding[] = [];
  const semantic = s.data.semantic as Semantic | undefined;
  if (!s.confirmations.semantic || !semantic)
    findings.push(f("semantic-missing", "The semantic ledger is not confirmed.", "semantic"));
  else for (const problem of semanticProblems(semantic)) findings.push(f("semantic-problem", problem, "semantic"));

  const packet = s.data.packet as Packet | undefined;
  if (!s.confirmations.packet || !packet)
    findings.push(f("packet-missing", "The decision packet is not confirmed.", "packet"));
  else {
    for (const problem of packetProblems(packet)) findings.push(f("packet-problem", problem, "packet"));
    for (const missing of coverage.missing)
      findings.push(
        f("coverage-missing", `Render-required decision ${missing} is not visible in the rendered strategy.`, missing),
      );
  }
  return gate("gate-6-coherence", findings);
}

/** Exact render-coverage audit — every locked render-required record must appear. */
export function checkCoverage(rendered: string, packet: Packet): Checks["coverage"] {
  const required = packet.records
    .filter((record) => record.renderRequirement === "render-required" && record.resolutionState === "locked")
    .map((record) => record.id);
  const haystack = rendered.toLowerCase();
  const missing = required.filter((id) => {
    const record = packet.records.find((entry) => entry.id === id)!;
    const needle = record.renderValue.split("\n")[0]!.trim().toLowerCase();
    return needle.length > 3 ? !haystack.includes(needle.slice(0, 60)) : true;
  });
  return { required, rendered: required.filter((id) => !missing.includes(id)), missing };
}

/** Gates 0–6 against the current session — no mutation. */
export function computeGates(s: M05Session): GateResult[] {
  const packet = s.data.packet as Packet | undefined;
  const rendered = (s.data.checks as Checks | undefined)?.rendered || renderStrategy(s);
  const coverage = packet ? checkCoverage(rendered, packet) : { required: [], rendered: [], missing: [] };
  return [gate0(s), gate1(s), gate2(s), gate3(s), gate4(s), gate5(s), gate6(s, coverage)];
}
