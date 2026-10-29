import {
  type Accountability,
  type Actions,
  type Decision,
  type Inheritance,
  type M11Session,
  type Plans,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the earlier work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const label = (value: string) => value.replaceAll("-", " ");

export function renderM11(session: M11Session): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Commercial Cycle\n\nNo confirmed inheritance yet.\n";
  const plans = session.data.plans as Plans | undefined;
  const decision = session.data.decision as Decision | undefined;
  const actions = session.data.actions as Actions | undefined;
  const accountability = session.data.accountability as Accountability | undefined;

  const sections: string[] = [
    `# Commercial Cycle

## The direction this cycle serves

**Outcome:** ${clean(inheritance.outcome)}

**Priority audience:** ${clean(inheritance.priorityAudience)}

**Route:** ${clean(inheritance.strategicRoute)}

**First phase:** ${clean(inheritance.firstPhaseObjective)}

**Progression condition:** ${clean(inheritance.progressionCondition)}
`,
  ];

  if (decision)
    sections.push(`## What this cycle commits

${clean(decision.commitment)}

**Committed by:** ${clean(decision.committedBy.name)} (${clean(decision.committedBy.role)})

**Scope:** ${clean(decision.scope)}

**Evidence purpose:** ${clean(decision.evidencePurpose)}

**Thresholds**

${decision.thresholds.map((threshold) => `- ${clean(threshold)}`).join("\n")}

**Review event:** ${clean(decision.reviewEvent)}

**Not committed**

${decision.notCommitted.map((item) => `- ${clean(item)}`).join("\n")}
`);

  if (plans)
    sections.push(`## First-phase plan

${plans.plans
  .map(
    (plan) =>
      `### ${clean(plan.consequenceId)}\n\n**Quantity:** ${clean(plan.quantity)}\n\n**Operational target:** ${clean(plan.operationalTarget)}\n\n**Capacity assumption:** ${clean(plan.capacityAssumption)}\n\n**Owner:** ${clean(plan.owner)}\n\n**Threshold:** ${clean(plan.threshold)} — ${clean(plan.thresholdRationale)}`,
  )
  .join("\n\n")}
`);

  if (actions)
    sections.push(`## Actions

${actions.actions.map((action) => `- **${clean(action.action)}** — ${clean(action.owner)}, ${clean(action.window)}, ${label(action.state)}. Proof: ${clean(action.proofAction)}`).join("\n")}
`);

  if (accountability)
    sections.push(`## Accountability

${accountability.owners.map((owner) => `- **${clean(owner.area)}** — ${clean(owner.owner)}`).join("\n")}

**Cadence:** ${clean(accountability.cadence)}

**Escalation:** ${clean(accountability.escalation)}

**Direction preserved:** ${label(accountability.preservationCheck)}${accountability.preservationNote ? ` — ${clean(accountability.preservationNote)}` : ""}
`);

  return sections.join("\n");
}

export const M11_DOCUMENT_KIND = "commercial-cycle";
export const M11_RECEIPT_KIND = "receipt";
