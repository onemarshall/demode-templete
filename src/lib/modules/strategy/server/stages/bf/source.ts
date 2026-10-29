import { BFSource, type BFSource as Source } from "./contracts";
import type { SourceRecord } from "../../data/repository";

export const BF_SOURCE_SLOT = "bf-m04";

/** Capabilities under which the Foundation may be prepared. */
const AUTHORISING_CAPABILITIES = /^hypothesis-only$|^full-standard$|^reduced-/;

/** The BF upstream is the sealed viability tuple plus the engagement authority it inherited. */
export function validateBFSource(source: SourceRecord): Source {
  const parsed = BFSource.parse(source.body);
  const capability = String(parsed.m04.routeAuthorization["authorised_capability"] ?? "none");
  const decisionState = String(parsed.m04.routeAuthorization["decision_state"] ?? "");
  if (decisionState !== "authorised" || !AUTHORISING_CAPABILITIES.test(capability))
    throw new Error(
      `The viability check's route authorisation does not permit foundation preparation (capability: ${capability}).`,
    );
  const owner = (parsed.entry.receipt as { decisionOwner?: { name?: string } }).decisionOwner;
  if (!owner?.name) throw new Error("The engagement authority names no decision owner.");
  return parsed;
}
