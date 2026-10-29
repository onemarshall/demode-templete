import {
  type Briefs,
  type Comparison,
  type Destinations,
  type Direction,
  type Gates,
  type Inheritance,
  type M09Session,
  type Measurement,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the upstream work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

export function renderM09(session: M09Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Digital Direction\n\nNo confirmed inheritance yet.\n";
  const direction = session.data.direction as Direction | undefined;
  const destinations = session.data.destinations as Destinations | undefined;
  const gates = session.data.gates as Gates | undefined;
  const comparison = session.data.comparison as Comparison | undefined;
  const briefs = session.data.briefs as Briefs | undefined;
  const measurement = session.data.measurement as Measurement | undefined;

  const sections: string[] = [
    `# Digital Direction

## Foundation inherited

**What the business is:** ${clean(inheritance.foundationSummary.business)}

**Practical outcome:** ${clean(inheritance.foundationSummary.practicalOutcome)}

**Distinction:** ${clean(inheritance.foundationSummary.distinction)}

**Belief shift** FROM "${clean(inheritance.journey.from)}" TO "${clean(inheritance.journey.to)}"
`,
  ];

  if (direction)
    sections.push(`## Direction

**Positioning:** ${clean(direction.positioning)}

**Audience:** ${clean(direction.audience)}

**Belief shift:** ${clean(direction.beliefShift)}

**Architecture principles**

${direction.architecturePrinciples.map((principle) => `- ${clean(principle)}`).join("\n")}
`);

  if (destinations)
    sections.push(`## Destinations

${destinations.destinations
  .map(
    (destination) =>
      `### ${clean(destination.name)}\n\n**Purpose:** ${clean(destination.purpose)}\n\n**Audience:** ${clean(destination.audienceId)}\n\n**Primary action:** ${clean(destination.primaryAction)}\n\n**Belief role:** ${clean(destination.beliefRole)}`,
  )
  .join("\n\n")}
`);

  if (gates)
    sections.push(`## Decisions

${gates.decisions.map((decision) => `- **${clean(decision.decision)}** → ${clean(decision.chosen)}. ${clean(decision.rationale)} (${clean(decision.evidenceRef)})`).join("\n")}
`);

  if (comparison)
    sections.push(`## Comparison

${comparison.competitors.map((competitor) => `- **${clean(competitor.name)}** — strength: ${clean(competitor.strength)}; weakness: ${clean(competitor.weakness)}; learning: ${clean(competitor.learning)}`).join("\n")}
`);

  if (briefs)
    sections.push(`## Page briefs

${briefs.briefs
  .map(
    (brief) =>
      `### ${clean(brief.id)}\n\n**Objective:** ${clean(brief.objective)}\n\n**Audience:** ${clean(brief.audience)}\n\n**Proof:** ${clean(brief.proof)}\n\n**Sections:** ${brief.sections.map((section) => clean(section)).join(", ")}\n\n**Primary action:** ${clean(brief.primaryAction)}`,
  )
  .join("\n\n")}
`);

  if (measurement)
    sections.push(`## Measurement

${measurement.metrics.map((metric) => `- **${clean(metric.metric)}** — baseline ${clean(metric.baseline)}, target ${clean(metric.target)}, source ${clean(metric.source)}, review ${clean(metric.reviewCadence)}`).join("\n")}
`);

  return sections.join("\n");
}

export const M09_DOCUMENT_KIND = "digital-direction";
export const M09_RECEIPT_KIND = "receipt";
