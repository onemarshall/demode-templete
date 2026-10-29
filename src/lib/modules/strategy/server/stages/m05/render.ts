import {
  type Audience,
  type Character,
  type Expression,
  type Identity,
  type Inheritance,
  type M05Session,
  type Packet,
  type Synthesis,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the upstream work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const list = (values: string[]) => values.map((value) => `- ${clean(value)}`).join("\n");

/**
 * The exact candidate. Deterministic: it reads only confirmed record data, never time or ids, so
 * the same confirmed record always renders the same bytes. Render-required packet decisions are
 * emitted verbatim so the coverage audit can find them.
 */
export function renderStrategy(s: M05Session): string {
  const inheritance = s.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Brand Strategy\n\nNo confirmed inheritance yet.\n";
  const semantic = s.data.semantic as { recommendation?: { state: string; reason: string } } | undefined;
  const identity = s.data.identity as Identity | undefined;
  const audience = s.data.audience as Audience | undefined;
  const character = s.data.character as Character | undefined;
  const expression = s.data.expression as Expression | undefined;
  const synthesis = s.data.synthesis as Synthesis | undefined;
  const packet = s.data.packet as Packet | undefined;

  const decisions = packet
    ? packet.records
        .filter((record) => record.renderRequirement === "render-required")
        .map((record) => `### ${clean(record.name)}\n\n${record.renderValue.trim()}\n`)
        .join("\n")
    : "";

  const identitySection = identity
    ? `## Purpose and vision

**Purpose:** ${clean(identity.purpose.statement)}

**Why it matters:** ${clean(identity.purpose.whyItMatters)}

**Vision:** ${clean(identity.vision.statement)}

**Values**

${identity.values.map((value) => `- **${clean(value.name)}** — protects ${clean(value.protects)}; rejects ${clean(value.rejects)}`).join("\n")}

**Brand beliefs**

${identity.brandBeliefs.map((belief) => `- ${clean(belief.statement)} (${belief.standing})`).join("\n")}
`
    : "";

  const audienceSection = audience
    ? `## Audience

**Primary:** ${clean(audience.primary.segment)} — ${clean(audience.primary.situation)}

**Current belief:** ${clean(audience.primary.currentBelief)}

**Desired belief:** ${clean(audience.primary.desiredBelief)}

**Not for:** ${clean(audience.antiAudience.who)} — ${clean(audience.antiAudience.opposedBelief)}
`
    : "";

  const characterSection = character
    ? `## Character

**Voice:** ${character.voice.attributes.map((attribute) => clean(attribute.attribute)).join(", ")}

**Personality:** ${character.personality.traits.map((trait) => clean(trait.trait)).join(", ")}

**X-Factor:** ${clean(character.attributes.xFactor.statement)}

**Whole distinction:** ${character.attributes.wholeDistinction.verdict} — ${clean(character.attributes.wholeDistinction.reason)}
`
    : "";

  const expressionSection = expression
    ? `## Expression

**Filter:** ${clean(expression.filter.forRule)}

**Tagline:** ${expression.tagline.state === "established" ? clean(expression.tagline.primary) : `(${expression.tagline.state})`}

**Visual direction:** ${clean(expression.visual.direction)}

**Never do**

${list(expression.visual.neverDo)}
`
    : "";

  const synthesisSection = synthesis
    ? `## The strategy

**Positioning:** ${clean(synthesis.core.positioningStatement)}

**Organising idea:** ${clean(synthesis.core.organisingIdea)}

**Decision summary:** ${clean(synthesis.core.decisionSummary)}

**Story**

${synthesis.story.map((beat) => `### ${beat.beat}\n\n${clean(beat.text)}\n\n*Belief at this moment:* ${clean(beat.beliefAtThisMoment)}`).join("\n\n")}
`
    : "";

  return `# Brand Strategy

## Foundation inherited

**What the business is:** ${clean(inheritance.foundationSummary.business)}

**Practical outcome:** ${clean(inheritance.foundationSummary.practicalOutcome)}

**Distinction:** ${clean(inheritance.foundationSummary.distinction)}

**Governing declarations**

${inheritance.governingDeclarations.map((declaration, index) => `${index + 1}. ${clean(declaration)}`).join("\n")}

**Belief shift** FROM "${clean(inheritance.journey.from)}" TO "${clean(inheritance.journey.to)}"

${semantic ? `**Inheritance recommendation:** ${semantic.recommendation?.state ?? "unrecorded"} — ${clean(semantic.recommendation?.reason ?? "")}\n` : ""}
${identitySection}
${audienceSection}
${characterSection}
${expressionSection}
${synthesisSection}
## Decisions carried into expression

${decisions || "No render-required decisions are recorded."}

## Boundaries

${synthesis ? list(synthesis.core.driftGuards) : "No boundaries recorded yet."}
`;
}

export const M05_DOCUMENT_KIND = "brand-strategy";
export const M05_RECEIPT_KIND = "receipt";

export const M05_VIEW_TITLES: Record<string, string> = {
  "brand-strategy": "Brand Strategy",
  "brand-story": "Brand Story",
  "executive-view": "Executive View",
  "strategy-summary": "Strategy Summary",
  presentation: "Presentation",
  "practitioner-brief": "Practitioner Brief",
};

/** Derived views are slices of the exact candidate — never a second, independently authored text. */
export function renderViews(rendered: string): { id: string; content: string }[] {
  const sections = rendered.split(/\n## /).map((part, index) => (index === 0 ? part : `## ${part}`));
  const pick = (predicate: (heading: string) => boolean) =>
    sections.filter((section) => predicate(section.split("\n")[0] ?? "")).join("\n\n");
  return [
    { id: "brand-strategy", content: rendered },
    { id: "brand-story", content: `${sections[0] ?? ""}\n\n${pick((heading) => heading.includes("The strategy"))}` },
    { id: "executive-view", content: `${sections[0] ?? ""}\n\n${pick((heading) => heading.includes("The strategy"))}` },
    { id: "strategy-summary", content: `${pick((heading) => heading.includes("Purpose"))}\n\n${pick((heading) => heading.includes("The strategy"))}` },
    { id: "presentation", content: rendered },
    { id: "practitioner-brief", content: `${pick((heading) => heading.includes("Character"))}\n\n${pick((heading) => heading.includes("Expression"))}` },
  ];
}
