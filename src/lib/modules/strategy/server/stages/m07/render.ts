import {
  STATEMENT_LABELS,
  type Claims,
  type Conversation,
  type Inheritance,
  type M07Session,
  type Measurement,
  type Objections,
  type Qualification,
  type Research,
  type Statements,
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
export function renderM07(session: M07Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Sales Strategy\n\nNo confirmed inheritance yet.\n";
  const statements = session.data.statements as Statements | undefined;
  const qualification = session.data.qualification as Qualification | undefined;
  const conversation = session.data.conversation as Conversation | undefined;
  const objections = session.data.objections as Objections | undefined;
  const claims = session.data.claims as Claims | undefined;
  const measurement = session.data.measurement as Measurement | undefined;
  const research = session.data.research as Research | undefined;

  const sections: string[] = [
    `# Sales Strategy

## Foundation inherited

**What the business is:** ${clean(inheritance.foundationSummary.business)}

**Practical outcome:** ${clean(inheritance.foundationSummary.practicalOutcome)}

**Distinction:** ${clean(inheritance.foundationSummary.distinction)}

**Belief shift** FROM "${clean(inheritance.journey.from)}" TO "${clean(inheritance.journey.to)}"

**Governing declarations**

${inheritance.governingDeclarations.map((declaration, index) => `${index + 1}. ${clean(declaration)}`).join("\n")}
`,
  ];

  if (statements)
    sections.push(`## Statements

${statements.statements
  .map(
    (statement) =>
      `- **${STATEMENT_LABELS[statement.id]}** — ${clean(statement.text)}${statement.deployable ? "" : " *(diagnostic)*"}`,
  )
  .join("\n")}
`);

  if (qualification)
    sections.push(`## Qualification

${qualification.criteria
  .map((criterion) => `- **${clean(criterion.name)}** — ${clean(criterion.test)}; disqualify if ${clean(criterion.disqualifyIf)}`)
  .join("\n")}

**Prospects**

${qualification.prospects.map((prospect) => `- ${clean(prospect.name)} — ${prospect.state}: ${clean(prospect.evidence)}`).join("\n")}

**Disqualification:** ${clean(qualification.protocol.trigger)} → ${clean(qualification.protocol.response)} (returns to ${clean(qualification.protocol.returnOwner)})
`);

  if (conversation)
    sections.push(`## Conversation

${conversation.stages
  .map(
    (stage) =>
      `### ${clean(stage.stage)}\n\n**Purpose:** ${clean(stage.purpose)}\n\n**Opening:** ${clean(stage.opening)}\n\n${bullets(stage.questions)}\n\n**Exit:** ${clean(stage.exitCriteria)}`,
  )
  .join("\n\n")}
`);

  if (objections)
    sections.push(`## Objections

${objections.objections
  .map(
    (objection) =>
      `- **${clean(objection.objection)}** — belief behind it: ${clean(objection.beliefBehind)}. Response: ${clean(objection.response)} (${clean(objection.evidenceRef)})`,
  )
  .join("\n")}
`);

  if (claims)
    sections.push(`## Claims

${claims.claims
  .map(
    (claim) =>
      `- **${claim.boundary}** — ${clean(claim.claim)}${claim.approvedWording ? `: “${clean(claim.approvedWording)}”` : ""} (${clean(claim.evidenceRef)})`,
  )
  .join("\n")}
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

  if (research)
    sections.push(`## Open research

${research.requests
  .map((request) => `- **${request.status}** — ${clean(request.question)} (${clean(request.method)}, owner ${clean(request.owner)})`)
  .join("\n")}
`);

  return sections.join("\n");
}

export const M07_DOCUMENT_KIND = "sales-strategy";
export const M07_RECEIPT_KIND = "receipt";
