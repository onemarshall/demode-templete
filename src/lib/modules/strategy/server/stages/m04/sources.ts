import type { deriveProceedBiasSignals } from "./validation";
import { hashM04 } from "./session";
/** Persisted server-verified source bundle. Only the trusted importer may publish this slot.
 * Extra source fields remain intact and hash-significant. Never reconstruct historical JSON.
 */
type BiasInput = Parameters<typeof deriveProceedBiasSignals>[0];
export interface M04Chain {
  folder: string;
  entry: {
    receipt: {
      decisionOwner: { name: string; authorityBasis: string };
      route: { route: "full" | "light" | "constrained" | "skip"; equivalentEvidence?: string };
    };
    route: unknown;
  };
  m01: Record<string, unknown>;
  m02: {
    sessionId: string;
    recon: NonNullable<BiasInput["m02Recon"]> & { synthesis: { statement: string } };
    [key: string]: unknown;
  };
  m03: {
    commitments: NonNullable<BiasInput["m03Commitments"]> & {
      grid: Array<{ action: string; move: string; proofCommitment: string }>;
      costOfCommitment: { costs: string[] };
      upstream: {
        carriedForward: {
          contrarianFlags: string[];
          acknowledgedRisks: Array<{
            routing: string | null;
            state: string;
            pattern: string;
            acknowledgmentLine: string;
          }>;
        };
      };
    };
    [key: string]: unknown;
  };
}
export interface CurrentM04Source {
  eligible: boolean;
  skipped?: boolean;
  chain?: M04Chain;
  blockers?: unknown[];
}
export const M04_SOURCE_SLOT = "m04-chain";
export function assertEligibleSource(current: CurrentM04Source) {
  if (!current.eligible || current.skipped || !current.chain)
    throw new Error(
      current.skipped
        ? "The approved route skips this module. No new viability output was created."
        : "No eligible current source chain",
    );
  const route = current.chain.entry.receipt.route;
  if (route.route === "skip") throw new Error("The approved route skips this module.");
  if (route.route === "light" && !route.equivalentEvidence?.trim())
    throw new Error("Light route needs equivalent evidence");
  return {
    chain: current.chain,
    route: route.route,
    equivalentEvidence: route.equivalentEvidence ?? "",
    hash: hashM04(current.chain),
  };
}
