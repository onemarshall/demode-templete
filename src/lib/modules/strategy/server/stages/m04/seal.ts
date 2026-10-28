import { createHash } from "node:crypto";
import {
  STAGE_SCHEMAS,
  DATA_KEYS,
  Decision,
  type DataStage,
  type M04Session,
  type Actor,
} from "./contracts";
import { hashM04 } from "./session";
import { currentChain, requireCurrent, validateStage } from "./workflow";
import type { CurrentM04Source } from "./sources";
import { calculateM04 } from "./calculations";
import { renderM04 } from "./render";
export function checksM04(s: M04Session, current: CurrentM04Source) {
  const checks: { id: string; passed: boolean; detail: string }[] = [];
  const add = (id: string, passed: boolean, detail: string) => checks.push({ id, passed, detail });
  add(
    "upstream",
    currentChain(s, current).valid,
    "Exact current brief and M01–M03 seals must match the pinned chain.",
  );
  for (const stage of Object.keys(STAGE_SCHEMAS) as DataStage[]) {
    const data = s.data[DATA_KEYS[stage]];
    const parsed = STAGE_SCHEMAS[stage].safeParse(data);
    const receipt = s.confirmations[stage];
    let semantics = true;
    try {
      if (stage !== "human-decision") validateStage(s, stage, data);
    } catch {
      semantics = false;
    }
    add(
      stage,
      semantics &&
        parsed.success &&
        !!receipt &&
        receipt.hash === hashM04(parsed.data) &&
        receipt.sourceHash === s.sourceHash,
      parsed.success
        ? "Exact human confirmation required."
        : (parsed.error.issues[0]?.message ?? "Incomplete"),
    );
  }
  add(
    "presentation",
    !!s.presented && s.presented.hash === hashM04(s.data.recommendation),
    "The exact recommendation must be shown before the decision.",
  );
  add(
    "route",
    s.routeAuthorization?.decision_state === "authorised",
    "Compare, revise and return are not authorising route decisions.",
  );
  add(
    "expiry",
    typeof s.routeAuthorization?.expiry === "string" &&
      Date.parse(s.routeAuthorization.expiry) > Date.now(),
    "Expired authority cannot be sealed or relied on.",
  );
  try {
    calculateM04(s.data.financialGrounding);
    add("economics", true, "Typed input ledger and deterministic calculations valid.");
  } catch (e) {
    add("economics", false, e instanceof Error ? e.message : "Invalid economics");
  }
  return checks;
}
export function downstreamM04(s: M04Session) {
  return {
    eligible: false,
    reasons: [
      ...(s.seal ? [] : ["The viability decision is not sealed."]),
      ...(s.routeAuthorization?.authorised_capability === "full-standard"
        ? []
        : ["The current source chain does not permit full brand-strategy reliance."]),
      "Business Foundation must separately assess these inputs, approve their exact versions and grant inheritance permission before brand-strategy reliance.",
    ],
    capability: s.routeAuthorization?.authorised_capability ?? "none",
  };
}
export function sealM04(s: M04Session, current: CurrentM04Source, actor: Actor, versionId: string) {
  requireCurrent(s, current);
  if (s.stage !== "checks") throw new Error("Complete the decision before sealing");
  const failed = checksM04(s, current).filter((x) => !x.passed);
  if (failed.length) throw new Error(failed.map((x) => `${x.id}: ${x.detail}`).join("\n"));
  const d = Decision.parse(s.data.decision);
  if (
    d.path === "adjust" &&
    !s.history.some(
      (x) => !!x && typeof x === "object" && "action" in x && x.action === "upstream-return",
    )
  )
    throw new Error("Open the linked upstream revision before sealing Adjust.");
  const id = s.sessionId,
    folder = s.folder;

  const at = new Date().toISOString();
  const rendered = renderM04(s);
  const envelope = {
    id: `m04-${id}`,
    business_id: folder,
    project_id: folder,
    run_id: id,
    module_id: "04",
    module_version: "1.0.0",
    schema_version: "1.0.0",
    source_contract: "04-Prompt:4.4;04-Quality-Gates:3.9",
    capability_profile: s.routeAuthorization?.authorised_capability,
    status: "locked",
    version_state: "sealed",
    evidence_state: "provisional",
    approval_state: "approved",
    gate_state: "passed",
    reliance_scope: s.routeAuthorization?.generation_permission,
    authority: actor,
    upstream_ids: s.sources,
    route: s.routeAuthorization,
    payload: s.data,
    evidence: s.data.context,
    risks: s.data.awareness,
    gates: checksM04(s, current),
    exceptions: [],
    privacy: { publication: "not-authorised" },
    invalidation: ["upstream version change", "material edit", "expiry", "consent withdrawal"],
    created_at: at,
  };
  const payload = {
    envelope,
    data: s.data,
    presented: s.presented,
    sourceHash: s.sourceHash,
    sources: s.sources,
    confirmations: s.confirmations,
    routeAuthorization: s.routeAuthorization,
    calculations: calculateM04(s.data.financialGrounding),
  };
  const hash = hashM04(payload);
  const receipt = {
    versionId,
    hash,
    renderHash: createHash("sha256").update(rendered).digest("hex"),
    actor,
    at,
    sourceHash: s.sourceHash,
    outcome: d.path,
    reliance: s.routeAuthorization?.generation_permission,
  };
  s.seal = { versionId, hash, at, path: `database:${versionId}` };
  s.stage = "sealed";
  s.status =
    d.path === "wait"
      ? "waiting"
      : d.path === "walk-away"
        ? "terminal"
        : d.path === "adjust"
          ? "adjustment-return"
          : "sealed";
  s.history.push({ action: "sealed", ...receipt });
  return { payload, canonicalPayload: JSON.stringify(payload), hash, receipt, rendered };
}
export function verifyM04Seal(
  s: M04Session,
  current: CurrentM04Source,
  canonicalPayload: string,
  receipt: { hash: string; renderHash: string },
  markdown: string,
) {
  try {
    const raw = JSON.parse(canonicalPayload);
    const valid =
      !!s.seal &&
      hashM04(raw) === s.seal.hash &&
      receipt.hash === s.seal.hash &&
      receipt.renderHash === createHash("sha256").update(markdown).digest("hex") &&
      hashM04(raw.data) === hashM04(s.data) &&
      hashM04(raw.routeAuthorization) === hashM04(s.routeAuthorization) &&
      hashM04(raw.confirmations) === hashM04(s.confirmations) &&
      hashM04(raw.presented) === hashM04(s.presented) &&
      hashM04(raw.sources) === hashM04(s.sources) &&
      raw.sourceHash === s.sourceHash &&
      currentChain(s, current).valid &&
      Date.parse(String(s.routeAuthorization?.expiry)) > Date.now();
    return {
      valid,
      reason: valid
        ? "Exact sealed content and current source chain verified."
        : "Content, authority, expiry or source mismatch.",
    };
  } catch {
    return { valid: false, reason: "Sealed snapshot or receipt unavailable." };
  }
}
