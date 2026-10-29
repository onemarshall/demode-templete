import {
  type Claims,
  type Compliance,
  type Distribution,
  type Gaps,
  type Inheritance,
  type Library,
  type M08Session,
  type Measures,
  type Mission,
  type Operations,
  type Pillars,
  type Production,
  type SalesMap,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the upstream work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const bullets = (values: string[]) => values.map((value) => `- ${clean(value)}`).join("\n");

/** Deterministic: reads only confirmed record data. */
export function renderM08(session: M08Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Content Strategy\n\nNo confirmed inheritance yet.\n";
  const mission = session.data.mission as Mission | undefined;
  const pillars = session.data.pillars as Pillars | undefined;
  const library = session.data.library as Library | undefined;
  const gaps = session.data.gaps as Gaps | undefined;
  const salesMap = session.data["sales-map"] as SalesMap | undefined;
  const claims = session.data.claims as Claims | undefined;
  const distribution = session.data.distribution as Distribution | undefined;
  const production = session.data.production as Production | undefined;
  const measures = session.data.measures as Measures | undefined;
  const operations = session.data.operations as Operations | undefined;
  const compliance = session.data.compliance as Compliance | undefined;

  const sections: string[] = [
    `# Content Strategy

## Foundation inherited

**What the business is:** ${clean(inheritance.foundationSummary.business)}

**Practical outcome:** ${clean(inheritance.foundationSummary.practicalOutcome)}

**Distinction:** ${clean(inheritance.foundationSummary.distinction)}

**Belief shift** FROM "${clean(inheritance.journey.from)}" TO "${clean(inheritance.journey.to)}"
`,
  ];

  if (mission)
    sections.push(`## Mission

${clean(mission.statement)}

**Audience:** ${clean(mission.audienceId)}

**Belief shift:** ${clean(mission.beliefShift)}

**Purpose:** ${clean(mission.purpose)}
`);

  if (pillars)
    sections.push(`## Pillars

${pillars.pillars
  .map((pillar) => `- **${clean(pillar.name)}** — ${pillar.proofType}; anchored in ${clean(pillar.beliefAnchor)}. ${clean(pillar.rationale)}`)
  .join("\n")}
`);

  if (library)
    sections.push(`## Library

${library.assets.map((asset) => `- **${clean(asset.title)}** — ${asset.format}, ${asset.state} (${clean(asset.evidenceRef)})`).join("\n")}
`);

  if (gaps)
    sections.push(`## Proof gaps

${gaps.gaps.map((gap) => `- **${gap.severity}** — ${clean(gap.missing)}. Remedy: ${clean(gap.remedy)}`).join("\n")}
`);

  if (salesMap)
    sections.push(`## Content to objection map

${salesMap.mappings.map((entry) => `- ${clean(entry.objectionId)} — ${entry.coverage} (${entry.assetIds.length} asset(s))`).join("\n")}
`);

  if (claims)
    sections.push(`## Claims

${claims.claims
  .map((claim) => `- **${claim.boundary}** — ${clean(claim.claim)}${claim.approvedWording ? `: “${clean(claim.approvedWording)}”` : ""}`)
  .join("\n")}
`);

  if (distribution)
    sections.push(`## Distribution

${distribution.channels.map((channel) => `- **${clean(channel.channel)}** — ${clean(channel.cadence)}, owner ${clean(channel.owner)}`).join("\n")}
`);

  if (production)
    sections.push(`## Production

${production.workflow.map((step) => `- **${clean(step.stage)}** — ${clean(step.input)} → ${clean(step.output)} (${clean(step.sla)}, ${clean(step.owner)})`).join("\n")}
`);

  if (measures)
    sections.push(`## Measures

${measures.metrics
  .map((metric) => `- **${clean(metric.metric)}** — baseline ${clean(metric.baseline)}, target ${clean(metric.target)}, source ${clean(metric.source)}, review ${clean(metric.reviewCadence)}`)
  .join("\n")}
`);

  if (operations)
    sections.push(`## Operations

**Owner:** ${clean(operations.owner)}

**Cadence:** ${clean(operations.cadence)}

**Review forum:** ${clean(operations.reviewForum)}

**Escalation:** ${clean(operations.escalation)}
`);

  if (compliance)
    sections.push(`## Compliance

${compliance.checks.map((check) => `- ${check.result === "pass" ? "✓" : check.result === "fail" ? "✗" : "–"} ${clean(check.item)}`).join("\n")}
`);

  return sections.join("\n");
}

export const M08_DOCUMENT_KIND = "content-strategy";
export const M08_RECEIPT_KIND = "receipt";
