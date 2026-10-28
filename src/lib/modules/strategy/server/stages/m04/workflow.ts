import {
  STAGES,
  STAGE_SCHEMAS,
  DATA_KEYS,
  type DataStage,
  type M04Session,
  type Actor,
  Context,
  ConvictionCost,
  MarketReadiness,
  HumanLoad,
  FinancialGrounding,
  Awareness,
  Recommendation,
  Decision,
} from "./contracts";
import { hashM04 } from "./session";
import { type M04Chain, type CurrentM04Source } from "./sources";
import { validateFinancialGrounding, deriveProceedBiasSignals } from "./validation";
/** A pure stage guard, safe to explain to the authorised reviewer. */
export class M04ReviewRequiredError extends Error {
  readonly code = "stage-review-required";
  constructor(message: string) { super(message); this.name = "M04ReviewRequiredError"; }
}
export function currentChain(s: M04Session, check: CurrentM04Source) {
  return {
    valid:
      check.eligible && !check.skipped && !!check.chain && hashM04(check.chain) === s.sourceHash,
    check,
  };
}
export function requireCurrent(s: M04Session, current: CurrentM04Source) {
  if (!currentChain(s, current).valid)
    throw new Error(
      "Upstream authority changed or is ineligible. Reconcile and create a new checked session.",
    );
}
export function stageData(s: M04Session, stage: DataStage) {
  return s.data[DATA_KEYS[stage]];
}
export function invalidateFrom(s: M04Session, stage: DataStage) {
  const i = STAGES.indexOf(stage);
  for (const key of Object.keys(DATA_KEYS) as DataStage[]) {
    if (STAGES.indexOf(key) >= i) {
      delete s.confirmations[key];
      if (key !== stage) delete s.data[DATA_KEYS[key]];
    }
  }
  s.presented = null;
  s.routeAuthorization = null;
  s.stage = stage;
  s.status = "revision-requested";
}
const unique = (xs: string[]) => new Set(xs).size === xs.length;
export function guardStageMutation(s: M04Session, action: string, stage: DataStage) {
  if (s.status === "dependency-return" || s.status === "adjustment-return")
    throw new Error("Reconcile the upstream return and create a newly checked session.");
  if (action === "revise" && !s.confirmations[stage])
    throw new Error("There is no confirmed stage to revise");
  if (action !== "revise" && s.stage !== stage)
    throw new Error(`Complete ${s.stage} before ${stage}`);
}
export function allowedOutputsForDecision(
  response: string,
  path: string,
  reducedName: string,
  requested: string[],
) {
  const authorising = response === "accept" || response === "override";
  const ceiling =
    authorising && path === "proceed-informed"
      ? ["M04 hypothesis analysis only"]
      : authorising && path === "accept-constraint"
        ? [`reduced-${reducedName}`]
        : [];
  if (requested.some((output) => !ceiling.includes(output)))
    throw new Error("Requested outputs exceed this response path’s capability ceiling.");
  return [...requested];
}
export function validateStage(s: M04Session, stage: DataStage, payload: unknown) {
  try { return validateStageInput(s, stage, payload); }
  catch (error) {
    // Zod errors keep their field paths; unexpected implementation errors stay private.
    if (error instanceof Error && error.name === "Error") throw new M04ReviewRequiredError(error.message);
    throw error;
  }
}
function validateStageInput(s: M04Session, stage: DataStage, payload: unknown) {
  const p = STAGE_SCHEMAS[stage].parse(payload);
  if (stage === "context") {
    const c = Context.parse(p);
    const owner = (s.sources as M04Chain).entry.receipt.decisionOwner;
    if (c.decisionOwner !== owner.name || c.authorityRef !== owner.authorityBasis)
      throw new Error("Decision owner must match the exact approved Engagement authority.");
    if (c.conflicts.some((x) => x.material && x.state !== "resolved"))
      throw new Error("Material conflicts must return to their source owner.");
    const yes = c.modelQuestions.filter((x) => x === "yes").length;
    const complexity = c.modelQuestions.includes("unknown")
      ? "unknown"
      : yes >= 3
        ? "high"
        : yes > 0
          ? "mixed"
          : "low";
    if (c.complexity !== complexity)
      throw new Error("Complexity must reflect the four recorded model questions.");
    if (!unique(c.principals)) throw new Error("Each principal must be named once");
  }
  if (stage === "conviction-cost") {
    const c = ConvictionCost.parse(p);
    const grid = (s.sources as M04Chain).m03.commitments.grid;
    if (
      grid.some(
        (row) => !c.rows.some((x) => x.commitmentId === row.action && x.sourceWording === row.move),
      )
    )
      throw new Error(
        "Every inherited commitment needs its exact source wording and a cost finding.",
      );
    if (!unique(c.rows.map((x) => x.commitmentId))) throw new Error("Duplicate commitment source");
  }
  if (stage === "human-load") {
    const h = HumanLoad.parse(p),
      c = Context.parse(s.data.context);
    if (
      !unique(h.principals.map((x) => x.name)) ||
      c.principals.some((n) => !h.principals.some((x) => x.name === n))
    )
      throw new Error("Record the load of every named principal.");
  }
  if (stage === "financial-grounding") {
    const result = validateFinancialGrounding(s.data.context, p);
    if (result.status === "needs-review")
      throw new Error(
        "Resolve mechanism applicability before confirming; retain limitations explicitly.",
      );
    const f = FinancialGrounding.parse(p);
    if (!unique(f.mechanisms.map((x) => x.id)))
      throw new Error("Every M1–M10 mechanism needs its own applicability decision.");
    for (const m of f.mechanisms)
      if (m.applicable && !m.inputIds.length && !m.limitation.trim())
        throw new Error(`${m.id} needs source inputs or an explicit limitation`);
  }
  if (stage === "awareness-and-weighing") {
    const a = Awareness.parse(p);
    if (!unique(a.markers.map((x) => x.id)) || a.markers.some((x) => x.id !== "U8" && !x.weighed))
      throw new Error("All eight awareness markers need named findings and human weighing.");
    const derived = biasM04(s);
    if (derived.unresolved.length)
      throw new Error("Bias inputs remain unresolved: " + derived.unresolved.join(", "));
    if (
      derived.signals.some((x) => !a.signals.some((y) => y.id === x.id && y.present === x.present))
    )
      throw new Error(
        "Bias signals must match the pinned source evidence, not editable preferences.",
      );
    const risks = (
      s.sources as M04Chain
    ).m03.commitments.upstream.carriedForward.acknowledgedRisks.filter(
      (x) => x.routing === "m04" && x.state === "present",
    );
    if (
      risks.some(
        (r) =>
          !a.riskSatisfaction.some(
            (x) =>
              x.riskId === r.pattern &&
              x.verbatim === r.acknowledgmentLine &&
              x.state === "satisfied",
          ),
      )
    )
      throw new Error(
        "Each M04-routed binding acknowledgement needs exact wording and its satisfying decision.",
      );
    if (!unique(a.signals.map((x) => x.id)))
      throw new Error("Each bias signal must be assessed once.");
    if (a.riskSatisfaction.some((x) => x.state !== "satisfied"))
      throw new Error("Unsatisfied binding risk obligations must return to their owner.");
    if (
      Number.isNaN(Date.parse(a.reflectionStarted)) ||
      Number.isNaN(Date.parse(a.returnedAt)) ||
      Date.parse(a.returnedAt) < Date.parse(a.reflectionStarted)
    )
      throw new Error(
        "Record valid reflection and return dates; time alone does not prove weighing.",
      );
  }
  if (stage === "recommendation") {
    const r = Recommendation.parse(p);
    if (!r.routes.some((x) => x.path === r.recommendedPath))
      throw new Error("The recommended path must be assessed alongside the alternatives.");
    if (!unique(r.routes.map((x) => x.path)))
      throw new Error("Assess each alternative route once.");
    if (r.meaningRecords.some((m) => m.state !== "confirmed"))
      throw new Error("Material route meanings require explicit human confirmation.");
  }
  return p;
}
export function stepM04(
  s: M04Session,
  current: CurrentM04Source,
  actor: Actor,
  action: string,
  stage: DataStage,
  payload: unknown,
) {
  requireCurrent(s, current);
  if (!(stage in STAGE_SCHEMAS)) throw new Error("Unknown working stage");
  guardStageMutation(s, action, stage);
  if (action === "revise") {
    invalidateFrom(s, stage);
    s.history.push({ action, stage, actor, at: new Date().toISOString() });
    return;
  }
  if (action === "save") {
    s.drafts[stage] = payload;
    return;
  }
  if (action !== "confirm") throw new Error("Unsupported stage action");
  if (stage === "human-decision")
    throw new Error("Use the explicit decision action after seeing the recommendation");
  const p = validateStage(s, stage, payload);
  s.data[DATA_KEYS[stage]] = p;
  delete s.drafts[stage];
  s.confirmations[stage] = {
    actor,
    at: new Date().toISOString(),
    decision: "confirmed",
    target: stage,
    revision: s.revision + 1,
    hash: hashM04(p),
    sourceHash: s.sourceHash,
  };
  s.stage = STAGES[STAGES.indexOf(stage) + 1];
  s.status = "draft";
  if (
    stage === "conviction-cost" &&
    ["higher", "new-cost"].includes(ConvictionCost.parse(p).comparison)
  ) {
    s.stage = stage;
    s.status = "dependency-return";
  }
  if (stage === "market-readiness" && MarketReadiness.parse(p).changesMarketFinding) {
    s.stage = stage;
    s.status = "dependency-return";
  }
  s.history.push({ action, stage, actor, at: new Date().toISOString() });
}
export function biasM04(s: M04Session) {
  const chain = s.sources as M04Chain;
  const cost = s.data.convictionCost ? ConvictionCost.parse(s.data.convictionCost) : null;
  const h = s.data.humanLoad ? HumanLoad.parse(s.data.humanLoad) : null;
  const derived = deriveProceedBiasSignals({
    m02Recon: chain.m02.recon as Parameters<typeof deriveProceedBiasSignals>[0]["m02Recon"],
    m03Commitments: chain.m03.commitments,
    humanLoad: h,
    costComparison: cost
      ? {
          materiallyExceeds: cost.comparison === "higher",
          sourceRef: "m04.convictionCost",
          basis: cost.comparisonBasis,
        }
      : null,
  });
  const count = derived.records.filter((x) => x.present === true).length;
  return {
    count,
    signals: derived.records,
    unresolved: derived.unresolved,
    tilt: derived.unresolved.length
      ? "Unresolved evidence"
      : count >= 3
        ? "Wait or Walk Away"
        : count > 0
          ? "Adjust the Path"
          : "No default tilt",
  };
}

export function presentM04(s: M04Session, current: CurrentM04Source, actor: Actor) {
  requireCurrent(s, current);
  if (s.stage !== "human-decision" || !s.confirmations.recommendation)
    throw new Error("Confirm the complete recommendation before presenting it.");
  s.presented = { hash: hashM04(s.data.recommendation), at: new Date().toISOString(), actor };
}
const PATH_NAMES = {
  "proceed-informed": "Proceed Informed",
  adjust: "Adjust the Path",
  wait: "Wait",
  "accept-constraint": "Accept the Constraint",
  "walk-away": "Walk Away",
} as const;
export function decideM04(
  s: M04Session,
  current: CurrentM04Source,
  actor: Actor,
  payload: unknown,
) {
  requireCurrent(s, current);
  if (s.stage !== "human-decision") throw new Error("Decision is out of order");
  const d = Decision.parse(payload);
  const r = Recommendation.parse(s.data.recommendation);
  const c = Context.parse(s.data.context);
  if (actor.name !== c.decisionOwner || actor.authorityRef !== c.authorityRef)
    throw new Error("The recorded decision owner must make this decision.");
  if (!s.presented || d.memoHash !== s.presented.hash || d.memoHash !== hashM04(r))
    throw new Error("Read the exact current recommendation before deciding.");
  if (d.response === "accept" && d.path !== r.recommendedPath)
    throw new Error("A different path needs an explicit override record.");
  if (d.response === "override" && !d.override)
    throw new Error(
      "Record scope, accepted risks, evidence limits, review and expiry for the override.",
    );
  if (d.response !== "override" && d.override)
    throw new Error("Override details require an explicit override decision.");
  if (
    !Number.isFinite(Date.parse(d.reviewDate)) ||
    !Number.isFinite(Date.parse(d.expiry)) ||
    Date.parse(d.expiry) <= Date.now()
  )
    throw new Error("A current route needs valid review and future expiry dates.");
  if (d.path === "accept-constraint" && !/^[a-z0-9-]+$/.test(d.reducedName))
    throw new Error("Name the reduced non-commercial capability.");
  if (
    (d.path === "adjust" || d.response === "return-upstream") &&
    (!d.returnOwner || !d.changedPremise.trim())
  )
    throw new Error("Adjust needs an exact changed premise and its upstream owner.");
  const bias = biasM04(s);
  if (bias.unresolved.length)
    throw new Error("Resolve missing bias inputs before an authorising decision.");
  const contested =
    d.path === "proceed-informed" &&
    bias.count > 0 &&
    (d.switchFindings.length < 3 || !d.disconfirmation.trim());
  if (contested && !d.inabilityReason.trim())
    throw new Error(
      "Record three concrete switching findings or explicitly explain inability; your choice remains available.",
    );
  const authorising = ["accept", "override"].includes(d.response);
  const permittedOutputs = allowedOutputsForDecision(
    d.response,
    d.path,
    d.reducedName,
    d.allowedOutputs,
  );
  const capability = !authorising
    ? "none"
    : d.path === "walk-away"
      ? "terminal"
      : d.path === "wait"
        ? "wait"
        : d.path === "adjust"
          ? "none"
          : permittedOutputs.length === 0
            ? "none"
            : d.path === "accept-constraint"
              ? `reduced-${d.reducedName}`
              : "hypothesis-only";
  s.data.decision = d;
  s.confirmations["human-decision"] = {
    actor,
    at: new Date().toISOString(),
    decision: d.response,
    target: "decision",
    revision: s.revision + 1,
    hash: hashM04(d),
    sourceHash: s.sourceHash,
  };
  s.routeAuthorization = {
    route_id: `m04-${s.sessionId}`,
    route_version: s.revision + 1,
    upstream_versions: s.sources,
    system_recommendation: { hash: d.memoHash, record: r },
    authorised_human_decision: { ...d, actor, at: new Date().toISOString() },
    decision_owner: actor,
    decision_state: authorising ? "authorised" : "not_authorised",
    response_path: PATH_NAMES[d.path],
    rationale: d.rationale,
    authorised_capability: capability,
    allowed_outputs: permittedOutputs,
    deferred_outputs: d.deferredOutputs,
    prohibited_outputs: [
      ...new Set([...d.prohibitedOutputs, "M05 lock", "production", "publication", "spend"]),
    ],
    generation_permission:
      capability === "hypothesis-only"
        ? "M04 hypothesis analysis only"
        : capability.startsWith("reduced-")
          ? "named reduced preparation only"
          : "none",
    evidence_confidence: r.confidence,
    assumptions: r.assumptions,
    unresolved_evidence: r.unresolvedEvidence,
    commercial_constraints: s.data.financialGrounding,
    obligations: s.data.awareness,
    non_overridable_blocks: [
      "invalid upstream authority",
      "safety",
      "legality",
      "fabrication",
      "false attribution",
      "privacy",
      "consent",
      "false authority transitions",
    ],
    override: {
      state: contested ? "contested" : d.response === "override" ? "overridden" : "not_overridden",
      owner: actor,
      rationale: d.rationale,
      ...d.override,
    },
    review_date: d.reviewDate,
    expiry: d.expiry,
    re_entry_trigger: d.reEntryTrigger,
    closure_condition: d.closureCondition,
    invalidation_conditions: [
      "Changed upstream version",
      "Changed material finding or decision",
      "Expired permission",
      "Withdrawn consent",
    ],
    contested,
  };
  s.stage = authorising ? "checks" : "recommendation";
  s.status =
    d.response === "compare"
      ? "awaiting-input"
      : d.response === "revise"
        ? "revision-requested"
        : d.response === "return-upstream" || d.path === "adjust"
          ? "adjustment-return"
          : d.path === "wait"
            ? "waiting"
            : d.path === "walk-away"
              ? "terminal"
              : "draft";
  if (!authorising) {
    delete s.confirmations.recommendation;
    s.presented = null;
  }
  s.history.push({
    action: "decision",
    actor,
    at: new Date().toISOString(),
    memoHash: d.memoHash,
  });
}
