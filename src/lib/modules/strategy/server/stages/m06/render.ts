import {
  STATEMENT_LABELS,
  type Activation,
  type Audience,
  type Checks,
  type Expressions,
  type Foundation,
  type Inheritance,
  type Measurement,
  type M06Session,
  type Positioning,
  type Routes,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the upstream work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const bullets = (values: string[]) => values.map((value) => `- ${clean(value)}`).join("\n");

/** Deterministic: reads only confirmed record data, never time or ids. */
export function renderM06(session: M06Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Marketing Strategy\n\nNo confirmed inheritance yet.\n";
  const foundation = session.data.foundation as Foundation | undefined;
  const audience = session.data.audience as Audience | undefined;
  const positioning = session.data.positioning as Positioning | undefined;
  const expressions = session.data.expressions as Expressions | undefined;
  const routes = session.data.routes as Routes | undefined;
  const activation = session.data.activation as Activation | undefined;
  const measurement = session.data.measurement as Measurement | undefined;

  const sections: string[] = [
    `# Marketing Strategy

## Foundation inherited

**What the business is:** ${clean(inheritance.foundationSummary.business)}

**Practical outcome:** ${clean(inheritance.foundationSummary.practicalOutcome)}

**Distinction:** ${clean(inheritance.foundationSummary.distinction)}

**Belief shift** FROM "${clean(inheritance.journey.from)}" TO "${clean(inheritance.journey.to)}"

**Governing declarations**

${inheritance.governingDeclarations.map((declaration, index) => `${index + 1}. ${clean(declaration)}`).join("\n")}
`,
  ];

  if (foundation)
    sections.push(`## Brand foundation

**Positioning:** ${clean(foundation.brandPositioning)}

**Promise:** ${clean(foundation.brandPromise)}

**Basis:** ${clean(foundation.positioningBasis)}
`);

  if (audience)
    sections.push(`## Audience

${audience.segments
  .map(
    (segment) =>
      `### ${clean(segment.name)} (${segment.beliefStage})${segment.id === audience.primaryId ? " — primary" : ""}\n\n**Situation:** ${clean(segment.situation)}\n\n**Current belief:** ${clean(segment.currentBelief)}\n\n**Desired belief:** ${clean(segment.desiredBelief)}`,
  )
  .join("\n\n")}
`);

  if (positioning)
    sections.push(`## Positioning

${clean(positioning.statement)}

**Why it holds:** ${clean(positioning.rationale)}

**Competitor test:** ${clean(positioning.competitorTest)}

**Belief trace:** ${clean(positioning.beliefTrace)}

**Proof basis:** ${clean(positioning.proofBasis)}
`);

  if (expressions)
    sections.push(`## Statements

${expressions.statements
  .map((statement) => `- **${STATEMENT_LABELS[statement.id]}** — ${clean(statement.text)}`)
  .join("\n")}
`);

  if (routes)
    sections.push(`## Routes

${routes.routes
  .map(
    (route) =>
      `- **${clean(route.channel)}** — ${route.function}, ${route.disposition}, evidence ${route.evidenceConfidence}. ${clean(route.rationale)}`,
  )
  .join("\n")}
`);

  if (activation)
    sections.push(`## Activation

**Owner:** ${clean(activation.owner)}

**Sequence**

${bullets(activation.sequence)}

**Budget basis:** ${clean(activation.budgetBasis)}

**First actions**

${bullets(activation.firstActions)}
`);

  if (measurement)
    sections.push(`## Measurement

${measurement.metrics
  .map(
    (metric) =>
      `- **${clean(metric.metric)}** — baseline ${clean(metric.baseline)}, target ${clean(metric.target)}, source ${clean(metric.source)}, review ${clean(metric.reviewCadence)}`,
  )
  .join("\n")}
`);

  return sections.join("\n");
}

export const M06_DOCUMENT_KIND = "marketing-strategy";
export const M06_RECEIPT_KIND = "receipt";

export function renderChecks(checks: Checks): string {
  return checks.gates.map((entry) => `${entry.id}: ${entry.result}`).join("\n");
}
