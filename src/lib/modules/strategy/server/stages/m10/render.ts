import {
  type Artefact,
  type Behaviours,
  type Context,
  type Inheritance,
  type M10Session,
  type Measurement,
  type OperatingModel,
  type Resonance,
  type Routes,
  type Spatial,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the upstream work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

export function renderM10(session: M10Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Visual Identity\n\nNo confirmed inheritance yet.\n";
  const spatial = session.data.spatial as Spatial | undefined;
  const resonance = session.data.resonance as Resonance | undefined;
  const behaviours = session.data.behaviours as Behaviours | undefined;
  const context = session.data.context as Context | undefined;
  const model = session.data["operating-model"] as OperatingModel | undefined;
  const routes = session.data.routes as Routes | undefined;
  const artefacts = session.data.artefact as Artefact | undefined;
  const measurement = session.data.measurement as Measurement | undefined;

  const sections: string[] = [
    `# Visual Identity

## Foundation inherited

**What the business is:** ${clean(inheritance.foundationSummary.business)}

**Practical outcome:** ${clean(inheritance.foundationSummary.practicalOutcome)}

**Distinction:** ${clean(inheritance.foundationSummary.distinction)}

**Belief shift** FROM "${clean(inheritance.journey.from)}" TO "${clean(inheritance.journey.to)}"
`,
  ];

  if (spatial)
    sections.push(`## Spatial model

**Principle:** ${clean(spatial.spatialPrinciple)}

**Grid:** ${clean(spatial.grid)}

**Density:** ${clean(spatial.density)}

**Hierarchy:** ${clean(spatial.hierarchyNotes)}

**Proportions**

${spatial.proportions.map((proportion) => `- ${clean(proportion)}`).join("\n")}
`);

  if (resonance)
    sections.push(`## Resonance

${resonance.resonances.map((entry) => `- **${clean(entry.element)}** — ${clean(entry.beliefConnection)} (${clean(entry.evidence)})`).join("\n")}
`);

  if (behaviours)
    sections.push(`## Behaviours

${behaviours.behaviours.map((entry) => `- **${clean(entry.context)}** — ${clean(entry.behaviour)}. Belief: ${clean(entry.beliefConnection)}`).join("\n")}
`);

  if (context)
    sections.push(`## Contexts

${context.contexts
  .map((entry) => `### ${clean(entry.context)}\n\n**Constraints:** ${entry.constraints.map((constraint) => clean(constraint)).join("; ")}\n\n**Adaptation:** ${clean(entry.adaptation)}`)
  .join("\n\n")}
`);

  if (model)
    sections.push(`## Operating model

**Owner:** ${clean(model.owner)}

**Cadence:** ${clean(model.cadence)}

**Tooling:** ${model.tooling.map((tool) => clean(tool)).join(", ")}

**Governance:** ${clean(model.governance)}
`);

  if (routes)
    sections.push(`## Routes

${routes.routes.map((route) => `- **${clean(route.route)}** — ${clean(route.audience)}, ${clean(route.purpose)} (${clean(route.artefactId)})`).join("\n")}
`);

  if (artefacts)
    sections.push(`## Artefacts

${artefacts.artefacts.map((artefact) => `- **${clean(artefact.name)}** — ${clean(artefact.format)}, ${artefact.state}. ${clean(artefact.purpose)}`).join("\n")}
`);

  if (measurement)
    sections.push(`## Measurement

${measurement.metrics.map((metric) => `- **${clean(metric.metric)}** — baseline ${clean(metric.baseline)}, target ${clean(metric.target)}, source ${clean(metric.source)}, review ${clean(metric.reviewCadence)}`).join("\n")}
`);

  return sections.join("\n");
}

export const M10_DOCUMENT_KIND = "visual-identity";
export const M10_RECEIPT_KIND = "receipt";
