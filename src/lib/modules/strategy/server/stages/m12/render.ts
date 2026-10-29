import {
  type Assets,
  type Checklist,
  type Inheritance,
  type M12Session,
  type Response,
  type Rhythm,
  type Rules,
  type Schedule,
  type Scorecard,
  type Transition,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the earlier work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const label = (value: string) => value.replaceAll("-", " ");

export function renderM12(session: M12Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Working Cycle\n\nNo confirmed inheritance yet.\n";
  const assets = session.data.assets as Assets | undefined;
  const rhythm = session.data.rhythm as Rhythm | undefined;
  const schedule = session.data.schedule as Schedule | undefined;
  const response = session.data.response as Response | undefined;
  const scorecard = session.data.scorecard as Scorecard | undefined;
  const rules = session.data.rules as Rules | undefined;
  const checklist = session.data.checklist as Checklist | undefined;
  const transition = session.data.transition as Transition | undefined;

  const sections: string[] = [
    `# Working Cycle

## What this cycle delivers

**Route:** ${clean(inheritance.strategicRoute)}

**Quantities and thresholds**

${inheritance.quantities.map((entry) => `- **${clean(entry.consequenceId)}** — ${clean(entry.quantity)}; threshold: ${clean(entry.threshold)}`).join("\n")}

**Owners**

${inheritance.owners.map((owner) => `- **${clean(owner.area)}** — ${clean(owner.owner)}`).join("\n")}

**Review event:** ${clean(inheritance.reviewEvent)}
`,
  ];

  if (schedule)
    sections.push(`## Schedule

${schedule.items
  .map(
    (item) =>
      `- **${clean(item.work)}** — ${clean(item.owner)}, ${clean(item.start)} → ${clean(item.due)}${item.dependency ? `, depends on ${clean(item.dependency)}` : ""}. Proof: ${clean(item.proofAction)}`,
  )
  .join("\n")}
`);

  if (rhythm)
    sections.push(`## Operating rhythm

**Weekly cadence:** ${clean(rhythm.weeklyCadence)}

${rhythm.checkpoints.map((checkpoint) => `- **${clean(checkpoint.name)}** — ${clean(checkpoint.when)}: ${clean(checkpoint.purpose)}`).join("\n")}

**Review forum:** ${clean(rhythm.reviewForum)}

**Escalation:** ${clean(rhythm.escalation)}
`);

  if (assets)
    sections.push(`## Assets

${assets.assets.map((asset) => `- **${clean(asset.name)}** — ${label(asset.state)}, owner ${clean(asset.owner)}${asset.dependency ? `, blocks ${clean(asset.dependency)}` : ""}`).join("\n")}
`);

  if (response)
    sections.push(`## When something slips

${response.protocols.map((protocol) => `- **${clean(protocol.trigger)}** → ${label(protocol.response)} (${clean(protocol.owner)})`).join("\n")}
`);

  if (scorecard)
    sections.push(`## Scorecard

${scorecard.measures.map((measure) => `- **${clean(measure.measure)}** — target ${clean(measure.target)}, current ${clean(measure.current)}, source ${clean(measure.source)}, review ${clean(measure.reviewCadence)}`).join("\n")}
`);

  if (rules)
    sections.push(`## Operating rules

${rules.operatingRules.map((rule) => `- ${clean(rule)}`).join("\n")}

**Definition of done:** ${clean(rules.definitionOfDone)}

**Quality bar:** ${clean(rules.qualityBar)}

**Handoff rule:** ${clean(rules.handoffRule)}
`);

  if (checklist)
    sections.push(`## Checklists

${checklist.items
  .map(
    (item) =>
      `### ${clean(item.work)}\n\n**Ready:** ${item.readyCriteria.map((criterion) => clean(criterion)).join("; ")}\n\n**Done:** ${item.doneCriteria.map((criterion) => clean(criterion)).join("; ")}${item.blockedIf ? `\n\n**Blocked if:** ${clean(item.blockedIf)}` : ""}`,
  )
  .join("\n\n")}
`);

  if (transition)
    sections.push(`## Close-out

${clean(transition.closeOut)}

**Review inputs**

${transition.reviewInputs.map((item) => `- ${clean(item)}`).join("\n")}

**Carried over**

${transition.carryOver.map((item) => `- ${clean(item)}`).join("\n")}

**Next cycle trigger:** ${clean(transition.nextCycleTrigger)}
`);

  return sections.join("\n");
}

export const M12_DOCUMENT_KIND = "working-cycle";
export const M12_RECEIPT_KIND = "receipt";
