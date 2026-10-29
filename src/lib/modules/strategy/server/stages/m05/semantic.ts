import { HIERARCHY_LEVELS, type Semantic } from "./contracts";

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/** FW_34 — the ledger must be complete, exact where it claims exactness, and honestly recommended. */
export function semanticProblems(semantic: Semantic): string[] {
  const problems: string[] = [];

  const levels = new Set(semantic.hierarchy.map((row) => row.level));
  for (const level of HIERARCHY_LEVELS)
    if (!levels.has(level)) problems.push(`The hierarchy has no row for "${level}".`);
  for (const row of semantic.hierarchy)
    if (row.state === "derived" && row.itemIds.length === 0)
      problems.push(`Hierarchy level "${row.level}" is derived but cites no ledger items.`);

  const ids = new Set(semantic.items.map((item) => item.id));
  for (const item of semantic.items) {
    if (item.mustPreserve === "exact" && norm(item.exactLanguage) !== norm(item.confirmedMeaning))
      problems.push(
        `Ledger item "${item.id}" must preserve exact language but its confirmed meaning differs from the source wording.`,
      );
    if (item.promotionPermission === "prohibited" && item.publicCopyState === "approved-for-role")
      problems.push(
        `Ledger item "${item.id}" is prohibited from promotion but is approved for public use.`,
      );
    if (item.expressionPermission === "prohibited" && item.headlinePermission === "yes")
      problems.push(`Ledger item "${item.id}" is prohibited from expression but permitted in a headline.`);
    if (item.promotionRequiresReason && !item.knownBoundaries.length)
      problems.push(`Ledger item "${item.id}" needs a promotion reason but records no boundary.`);
  }

  for (const promotion of semantic.promotions) {
    if (!ids.has(promotion.itemId))
      problems.push(`Promotion "${promotion.id}" cites an item that is not in the ledger.`);
    if (promotion.state === "held" && !promotion.conditions.length)
      problems.push(`Promotion "${promotion.id}" is held but records no conditions.`);
  }

  for (const check of semantic.adversarial) {
    if (check.state !== "pass")
      problems.push(
        `Adversarial check "${check.kind}" on "${check.target}" is ${check.state}${check.resolution ? `: ${check.resolution}` : "."}`,
      );
  }

  for (const entry of semantic.recognition)
    if (entry.state === "broken")
      problems.push(`Recognition continuity is broken for "${entry.itemId}".`);

  const exact = semantic.exactAuthorityCheck;
  for (const [field, value] of [
    ["declarationsVerbatim", exact.declarationsVerbatim],
    ["coreBeliefFromOwner", exact.coreBeliefFromOwner],
    ["ownerFieldsVerbatim", exact.ownerFieldsVerbatim],
  ] as const)
    if (value !== "pass") problems.push(`Exact-authority check "${field}" is ${value}.`);
  if (exact.mislabelledInherited.length)
    problems.push(`${exact.mislabelledInherited.length} inherited item(s) are mislabelled.`);
  if (exact.unclassifiedLoadBearing.length)
    problems.push(`${exact.unclassifiedLoadBearing.length} load-bearing item(s) are unclassified.`);

  if (semantic.recommendation.state === "return-upstream" || semantic.recommendation.state === "wait")
    problems.push(
      `The semantic ledger recommends ${semantic.recommendation.state}: ${semantic.recommendation.reason}`,
    );
  if (!semantic.recommendation.reason.trim())
    problems.push("The semantic ledger records no recommendation reason.");

  return problems;
}
