import {
  ENGAGEMENT_CHECK_FIELDS,
  type Inheritance,
  type MeaningRecord,
} from "./contracts";

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/** The inherited items that must each carry a confirmed meaning record. */
export const REQUIRED_MEANING_ITEMS = [
  "brokenThing",
  "hiddenTruth",
  "marketDeployableHiddenTruth",
  "nonNegotiable",
  "hardWonTeaching",
] as const;

function covered(records: MeaningRecord[], source: string): boolean {
  const needle = norm(source);
  return records.some((record) => norm(record.sourceWords).includes(needle));
}

/** Phase 0 — the inheritance cannot pass with an unexamined carrier or an unresolved engagement row. */
export function inheritanceProblems(inheritance: Inheritance): string[] {
  const problems: string[] = [];
  const records = inheritance.meaningRecords;

  for (const key of REQUIRED_MEANING_ITEMS)
    if (!covered(records, inheritance.convictions[key]))
      problems.push(`No meaning record covers the "${key}" conviction.`);
  if (!covered(records, inheritance.journey.from))
    problems.push("No meaning record covers the journey FROM statement.");
  if (!covered(records, inheritance.journey.to))
    problems.push("No meaning record covers the journey TO statement.");
  for (const declaration of inheritance.governingDeclarations)
    if (!covered(records, declaration))
      problems.push(
        `No meaning record covers the governing declaration "${declaration.slice(0, 60)}${declaration.length > 60 ? "…" : ""}".`,
      );

  for (const record of records) {
    if (record.state !== "confirmed") {
      problems.push(`Meaning record "${record.id}" is ${record.state}; Phase 0 needs it confirmed.`);
      continue;
    }
    for (const [field, label] of [
      ["interpretation", "interpretation"],
      ["alternative", "the strongest rejected alternative"],
      ["situation", "the recognition situation"],
      ["boundary", "the boundary"],
      ["repeatBack", "the repeat-back confirmation"],
    ] as const)
      if (!record[field].trim())
        problems.push(`Meaning record "${record.id}" has no ${label}.`);
  }

  const fields = new Set(inheritance.engagementCheck.map((row) => row.field));
  for (const field of ENGAGEMENT_CHECK_FIELDS)
    if (!fields.has(field))
      problems.push(`The engagement inheritance check has no row for "${field}".`);
  for (const row of inheritance.engagementCheck) {
    if (row.disposition === "missing-blocking" || row.disposition === "return-upstream")
      problems.push(
        `Engagement field "${row.field}" is ${row.disposition}; Phase 0 halts until it is resolved upstream.`,
      );
    if (row.disposition === "open-for-m05" && !row.note.trim())
      problems.push(`Engagement field "${row.field}" is open for M05 but records no note.`);
  }

  if (!inheritance.brandContext.scopeBasis.trim())
    problems.push("Brand context records no basis for its scope.");
  return problems;
}
