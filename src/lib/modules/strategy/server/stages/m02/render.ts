import type { M02Session, ReconLog, CollectionRecord } from "./session";
import type { ArtifactStore } from "./evidence";

const VERDICT = {
  provisional_a: ["PROCEED TO BUSINESS COMMITMENTS", "Provisional Outcome A", "Ruling: the conviction has enough external market support to justify the next strategic decision; the commercial case remains open."],
  validated_a: ["PROCEED TO BUSINESS COMMITMENTS", "Validated Outcome A", "Ruling: the conviction has external market support strong enough to justify the next strategic decision; the commercial case still needs its own test."],
  outcome_b: ["DO NOT PROCEED", "Outcome B", "Ruling: the market check did not find enough support to take this conviction forward in its current form."],
  outcome_c: ["RETURN FOR EVIDENCE", "Outcome C", "Ruling: the market gap exists, but it could not be traced to this conviction — the work returns for evidence before a position is built on it."],
} as const;
const NEXT = {
  provisional_a: "The work moves on to the Business Commitments stage — the question of what the business is prepared to stand behind. This pass permits hypothesis-mode work there only: nothing here locks a brand position or authorises spend.",
  validated_a: "The work moves on to the Business Commitments stage — the question of what the business is prepared to stand behind. Even a validated finding does not lock brand or authorise commercial commitment on its own.",
  outcome_b: "Do not build a business position on this finding. The evidence did not hold at a sustainable price for this cohort — the route is back to the Founder Conviction Foundation to revisit the conviction, or to stop here.",
  outcome_c: "Return for evidence. The gap in the market is real, but it could not be traced to this business's own conviction — the work goes back to the Founder Conviction Foundation before any position is built on it.",
} as const;
const GATE_LINE: Record<string, string> = { pass: "held", fail: "did not hold", "evidence-insufficient": "couldn't be assessed from what was gathered", pending: "wasn't assessed" };
const EVIDENCE_DISPOSITION = {
  sufficient_for_provisional: "the report fairly represents what the evidence supports, contradicts and leaves unknown, at the standard required for a provisional finding",
  insufficient: "the report does not yet fairly represent a sufficient evidence base",
  contested: "the evidence account was contested — the disagreement is on record rather than resolved",
} as const;
const CONFIDENCE = { high: "strong", medium: "moderate", low: "thin" } as const;

function clientText(value: string) {
  return value.replace(/\bart_[0-9a-f]{8}\b/g, "").replace(/→\s*m\d+/gi, "")
    .replace(/\(\s*—\s*/g, "(").replace(/\(\s+/g, "(").replace(/\s*—?\s*\)/g, ")")
    .replace(/\(\s*\)/g, "").replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}
function evidenceCounts(artifacts: ArtifactStore) {
  const gathered = artifacts.artifacts.filter((item) => item.status === "gathered");
  const count = (kind: string) => gathered.filter((item) => item.kind === kind).length;
  const parts = [
    [count("competitor"), "competitor artefact"], [count("customer"), "customer-side artefact"],
    [count("market"), "market-data artefact"], [count("owned"), "owned customer-evidence source"],
  ].filter(([n]) => Number(n) > 0).map(([n, label]) => `${n} ${label}${Number(n) === 1 ? "" : "s"}`);
  const sector = count("sector_synthesis");
  const base = parts.length ? parts.join(", ") : "no gathered artefacts";
  return sector ? `${base}; plus ${sector} governed sector-record ${sector === 1 ? "row" : "rows"} inherited as hypotheses` : base;
}

/** Stable client-facing projection of the confirmed M02 record; no model call. */
export function renderM02ClientDoc(session: M02Session, recon: ReconLog, collection: CollectionRecord, artifacts: ArtifactStore): string {
  const outcome = recon.synthesis.outcome as keyof typeof VERDICT;
  if (!(outcome in VERDICT)) throw new Error("M02 has no recordable outcome");
  const [verdict, classification, ruling] = VERDICT[outcome];
  const research = session.research.confirmed ?? session.research.draft;
  const scope = [recon.gate1.cohort || research?.cohort || "the cohort under review", research?.geography].filter(Boolean).join(" — ");
  const date = (session.updatedAt || new Date().toISOString()).slice(0, 10);
  const a = outcome === "provisional_a" || outcome === "validated_a";
  const found = [
    recon.gate1.descriptiveDefault ? `Across the competitors examined, the shared default is this: ${clientText(recon.gate1.descriptiveDefault)}` : null,
    recon.gate3.painProfile.pain ? `On the customer side, the pain that default produces: ${clientText(recon.gate3.painProfile.pain)}` : null,
    recon.gate6.b.traceSentence ? `And the gap traces back to this business's own conviction: ${clientText(recon.gate6.b.traceSentence)}` : null,
    recon.synthesis.statement ? clientText(recon.synthesis.statement) : null,
  ].filter(Boolean).join("\n\n");
  const gateRows = [
    ["What competitors believe — the shared default", recon.gate1], ["That default is vulnerable", recon.gate2],
    ["Real customer pain traces back to it", recon.gate3], ["Willingness to pay at a workable price", recon.gate4],
    ["The founder's conviction is evidenced in the market", recon.gate6.a], ["The gap belongs to this conviction specifically", recon.gate6.b],
  ].map(([label, gate]) => {
    const item = gate as { verdict: string; confidence?: "high" | "medium" | "low" | null };
    return `- ${label}: ${GATE_LINE[item.verdict] ?? item.verdict}${item.confidence ? ` — ${CONFIDENCE[item.confidence]} confidence` : ""}`;
  });
  const entanglement = recon.entanglement.pass === true
    ? "Each of those judgements rests on its own evidence — no single source carried more than one of them."
    : recon.entanglement.problems.length ? `Source separation was weaker than it should be: ${recon.entanglement.problems.join("; ")}.` : null;
  const sectorNote = session.sector ? `A governed sector record (${clientText(session.sector.title)}) seeded the questions this check asked — it supplied hypotheses, and the client-specific evidence above is what proved or disproved them here.` : null;
  const openQuestions = [
    recon.gate4.verdict !== "pass" ? `- Willingness to pay was not proved — ${clientText(recon.gate4.finding) || "the evidence gathered was not enough to support a sustainable price"}.` : `- Willingness to pay reads positive${recon.gate4.priceRange ? ` — assessed as “${clientText(recon.gate4.priceRange)}”` : ""}, but that is still evidence, not a sale.`,
    ...recon.riskFlags.map((flag) => `- ${clientText(flag)}`), ...recon.synthesis.acknowledgedRisks.map((risk) => `- ${clientText(risk)}`),
  ].filter(Boolean);
  const riskLines = recon.gate5.risks.filter((risk) => risk.state === "present").map((risk) =>
    `- ${clientText(risk.evidence) || "present"}${risk.severity ? ` — ${risk.severity}` : ""}${risk.acknowledgment.signedBy ? ` (acknowledged by ${clientText(risk.acknowledgment.signedBy)})` : risk.acknowledgment.declined ? " (acknowledgment declined)" : ""}`);
  const secondVoice = recon.secondVoice.present && recon.secondVoice.diverge
    ? `One open framing question remains: the person closest to the work describes the problem differently from the founder — ${clientText(recon.secondVoice.diverge)} That divergence is recorded rather than resolved here.` : null;
  const pain = clientText(recon.secondVoice.foundersProblem || recon.gate3.painProfile.pain);
  const commercial = pain ? `**Why this matters commercially.** ${/[.!?]$/.test(pain) ? pain : `${pain}.`}${recon.gate3.painProfile.trigger ? ` The situation it shows up in: ${clientText(recon.gate3.painProfile.trigger)}.` : ""} That is the buyer-side situation in which this conviction could create relevant value — the evidence supports asking the next question, not assuming the answer.` : null;
  return `# Market Reality Check

**${verdict}** — ${scope}

${a ? "*This is a green light for the next strategic question, not a green light for the business model.*" : ""}

${commercial ?? ""}

## What did we find?

${found || "No defensible finding could be stated from what was gathered."}

## Why do we believe it?

${gateRows.join("\n")}

Evidence base: ${evidenceCounts(artifacts)}. The gathering record closed as **${collection.state.replace(/_/g, " ")}**.
${entanglement ? `\n${entanglement}` : ""}${sectorNote ? `\n\n${sectorNote}` : ""}

## What does the evidence not prove?

${openQuestions.length ? openQuestions.join("\n") : "- Nothing further is on record as unproved at this scope."}
${secondVoice ? `\n${secondVoice}` : ""}${riskLines.length ? `\n\n**Risks named and acknowledged along the way:**\n\n${riskLines.join("\n")}` : ""}${recon.contrarianTrap.flags.length ? `\n\nContrarian-trap cautions on record: ${recon.contrarianTrap.flags.map(clientText).join("; ")}.` : ""}

## What happens next?

${NEXT[outcome]}

---

${ruling}

${session.evidenceReview ? `**Evidence judgement** — ${EVIDENCE_DISPOSITION[session.evidenceReview.disposition]}. ${clientText(session.evidenceReview.rationale)} — recorded by ${clientText(session.evidenceReview.by)}, ${session.evidenceReview.at.slice(0, 10)}.` : ""}

${session.progressionDecision ? `**Progression judgement** — ${clientText(session.progressionDecision.statement)} — recorded by ${clientText(session.progressionDecision.by)}, ${session.progressionDecision.at.slice(0, 10)}. Approving the next step does not treat demand, price or commercial viability as proved.` : ""}

---

*Internal classification: ${classification}. Recorded ${date}. This document reflects the sealed record — a later upstream change would produce a new version, not an edit to one.*`;
}
