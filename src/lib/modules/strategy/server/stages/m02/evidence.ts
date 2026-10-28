import { z } from "zod";
import { randomUUID } from "node:crypto";

// Typed evidence — the core M02 record. Every claim the gates make cites
// artifact IDs, which is what makes the entanglement check mechanical rather
// than prompt-level.
//
// Kinds:
//   competitor        — what competitors publish (pages, pricing, policies)
//   customer          — customer-side public evidence (reviews, forums)
//   market            — TAM / trajectory / tailwind evidence
//   owned             — the client's own customer data (Step 5a audit)
//   sector_synthesis  — rows inherited from the governed sector corpus
//
// Channel records how it arrived; access records who may see it; consent
// records the permission basis. Founder testimony is intentionally NOT a kind
// — it can originate a hypothesis but can never satisfy a market gate.

export const ArtifactKind = z.enum([
  "competitor",
  "customer",
  "market",
  "owned",
  "sector_synthesis",
]);

export type ArtifactKind = z.infer<typeof ArtifactKind>;

export const ArtifactChannel = z.enum(["url_fetch", "treg", "upload", "paste", "sector_corpus"]);

export type ArtifactChannel = z.infer<typeof ArtifactChannel>;

export const ArtifactAccess = z.enum(["public", "internal", "confidential"]);

export type ArtifactAccess = z.infer<typeof ArtifactAccess>;

export const ArtifactStatus = z.enum(["gathered", "missing", "failed"]);

export type ArtifactStatus = z.infer<typeof ArtifactStatus>;

// Evidence-strength / class vocabularies mirror the sector synthesis
// controlled vocabulary (Appendix A) — kept as plain strings on generic
// artifacts, enforced on sector_synthesis artifacts.
export const SectorProvenance = z.object({
  synthesisId: z.string(),
  synthesisVersion: z.string(),
  documentId: z.string(),
  // The field/collection path inside the synthesis this row came from
  // (e.g. "sector_mechanisms", "named_company_checklist") plus the row's
  // record_id.
  field: z.string(),
  recordId: z.string(),
  evidenceStrength: z.string().optional(),
  evidenceClass: z.string().optional(),
  sourceRefs: z.array(z.string()).default([]),
  scope: z.string().optional(),
  // The row itself, preserved verbatim.
  row: z.record(z.string(), z.unknown()).default({}),
});

export type SectorProvenance = z.infer<typeof SectorProvenance>;

export const Artifact = z.object({
  id: z.string().regex(/^art_[0-9a-f]{8}$/),
  kind: ArtifactKind,
  channel: ArtifactChannel,
  // What the artifact is about — competitor name, cohort, market label, owned dataset name.
  target: z.string().default(""),
  // Where it came from — platform, publication, system or corpus name.
  source: z.string(),
  url: z.string().optional(),
  finalUrl: z.string().optional(),
  // When the system captured it vs when the evidence is dated.
  retrievedAt: z.string(),
  evidenceDate: z.string().optional(),
  title: z.string().optional(),
  // The captured content — quote or extracted text, never paraphrase.
  verbatim: z.string().default(""),
  summary: z.string().optional(),
  access: ArtifactAccess,
  // Permission basis — "public artifact" for fetched pages; a recorded
  // consent reference for owned/internal data.
  consent: z.string().default("public artifact"),
  status: ArtifactStatus.default("gathered"),
  error: z.string().optional(),
  // Per-artifact gathering cost — treg credits, request counts (Q12).
  cost: z.object({ units: z.number(), unit: z.string() }).optional(),
  note: z.string().optional(),
  sector: SectorProvenance.optional(),
});

export type Artifact = z.infer<typeof Artifact>;

export const ArtifactStore = z.object({
  artifacts: z.array(Artifact).default([]),
});

export type ArtifactStore = z.infer<typeof ArtifactStore>;

export function newArtifactId() {
  return `art_${randomUUID().slice(0, 8)}`;
}

export const artifactById = (store: ArtifactStore, id: string) =>
  store.artifacts.find((a) => a.id === id);

function sourceIdentity(artifact: Artifact): string {
  const locator = artifact.finalUrl || artifact.url;
  if (locator) {
    try {
      const url = new URL(locator);
      url.hash = "";
      url.search = "";
      return `url:${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, "") || "/"}`;
    } catch {
      return `locator:${locator.trim().toLowerCase()}`;
    }
  }
  return `record:${artifact.channel}:${artifact.source.trim().toLowerCase()}:${artifact.target.trim().toLowerCase()}:${(artifact.title ?? "").trim().toLowerCase()}`;
}

// Gates 2, 3 and 6a must rest on distinct artifact sources — and a
// sector_synthesis artifact alone can never satisfy one of them; each gate
// needs at least one client- or competitor-specific artifact alongside. This
// is the mechanical check the prompt's Step 9 describes.
export function entanglementCheck(
  store: ArtifactStore,
  refs: { gate2: string[]; gate3: string[]; gate6a: string[] },
  required: { gate2?: boolean; gate3?: boolean; gate6a?: boolean } = {
    gate2: true,
    gate3: true,
    gate6a: true,
  },
): { pass: boolean; problems: string[] } {
  const problems: string[] = [];
  const resolved = (ids: string[], label: string, isRequired: boolean): Artifact[] => {
    const found = ids.map((id) => artifactById(store, id)).filter((a): a is Artifact => !!a);
    const missing = ids.filter((id) => !artifactById(store, id));
    if (missing.length) problems.push(`${label}: unknown artifact IDs ${missing.join(", ")}`);
    if (!found.length && isRequired) problems.push(`${label}: no artifacts cited`);
    return found;
  };
  const sources: Record<string, Set<string>> = {};
  for (const [gate, ids] of Object.entries(refs)) {
    const found = resolved(ids, gate, required[gate as keyof typeof required] !== false);
    if (required[gate as keyof typeof required] === false) {
      sources[gate] = new Set();
      continue;
    }
    // A gate needs at least one artifact that is not sector-level evidence.
    if (found.length && !found.some((a) => a.kind !== "sector_synthesis"))
      problems.push(
        `${gate}: sector synthesis alone cannot satisfy this gate — cite at least one client- or competitor-specific artifact`,
      );
    sources[gate] = new Set(found.map(sourceIdentity));
  }
  const gates = Object.keys(sources);
  for (let i = 0; i < gates.length; i++)
    for (let j = i + 1; j < gates.length; j++) {
      const shared = [...sources[gates[i]]].filter((source) => sources[gates[j]].has(source));
      if (shared.length)
        problems.push(
          `${gates[i]} and ${gates[j]} share artifacts ${shared.join(", ")} — the pass is weaker than it looks`,
        );
    }
  return { pass: problems.length === 0, problems };
}

/** Gate-specific evidence kinds required by the current M02 method. */
export function gateEvidenceCheck(
  store: ArtifactStore,
  refs: { gate1: string[]; gate2: string[]; gate3: string[]; gate4: string[]; gate6a: string[] },
  required: { gate1: boolean; gate2: boolean; gate3: boolean; gate4: boolean; gate6a: boolean } = {
    gate1: true,
    gate2: true,
    gate3: true,
    gate4: true,
    gate6a: true,
  },
) {
  const problems: string[] = [];
  const gathered = store.artifacts.filter((artifact) => artifact.status === "gathered");
  const check = (ids: string[], gate: string, allowed: ArtifactKind[], required = true) => {
    const selected = ids.map((id) => gathered.find((artifact) => artifact.id === id));
    if (required && !ids.length) problems.push(`${gate}: no evidence artifacts cited`);
    for (let i = 0; i < ids.length; i++) {
      const artifact = selected[i];
      if (!artifact) problems.push(`${gate}: ${ids[i]} is missing or not gathered`);
      else if (!allowed.includes(artifact.kind))
        problems.push(
          `${gate}: ${artifact.id} is ${artifact.kind}, not an allowed evidence kind (${allowed.join(", ")})`,
        );
    }
  };
  check(refs.gate1, "Gate 1", ["competitor"], required.gate1);
  check(refs.gate2, "Gate 2", ["competitor", "market"], required.gate2);
  check(refs.gate3, "Gate 3", ["customer", "owned"], required.gate3);
  check(refs.gate4, "Gate 4", ["customer", "owned", "market"], required.gate4);
  check(refs.gate6a, "Gate 6a", ["competitor", "customer", "market", "owned"], required.gate6a);
  return { pass: problems.length === 0, problems };
}
