import type { Packet } from "./contracts";

/** FW_40 — every material decision must be resolved, and every render-required one must carry the
 * exact value the strategy will show. */
export function packetProblems(packet: Packet): string[] {
  const problems: string[] = [];
  if (!packet.records.length) problems.push("The decision packet carries no records.");

  for (const record of packet.records) {
    if (record.state === "open")
      problems.push(`Decision "${record.name}" (${record.id}) is still open.`);
    if (record.state === "blocked")
      problems.push(`Decision "${record.name}" (${record.id}) is blocked.`);
    if (record.material && record.resolutionState === "unresolved")
      problems.push(`Material decision "${record.name}" (${record.id}) is unresolved.`);
    if (record.resolutionState === "return-upstream" && !record.returnOwner.trim())
      problems.push(`Decision "${record.name}" returns upstream but names no owner.`);
    if (record.renderRequirement === "render-required") {
      if (!record.renderValue.trim())
        problems.push(`Render-required decision "${record.name}" has no render value.`);
      if (record.resolutionState !== "locked" && record.resolutionState !== "not-required")
        problems.push(
          `Render-required decision "${record.name}" is ${record.resolutionState}; it must be locked before the strategy renders.`,
        );
    }
    if (!record.boundary.trim())
      problems.push(`Decision "${record.name}" records no boundary.`);
    if (!record.sourceRefs.length)
      problems.push(`Decision "${record.name}" cites no sources.`);
  }
  return problems;
}
