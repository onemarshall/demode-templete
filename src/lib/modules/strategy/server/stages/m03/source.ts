import { M03Upstream, type M03Upstream as Upstream } from "./session";
import type { SourceRecord } from "../../data/repository";

export const M03_SOURCE_SLOT = "m03-m02";

/** The M03 upstream body is the sealed M02 tuple plus the verbatim findings M03 drafts from.
 * It is derived server-side from an actual sealed M02 version — never assembled by a caller. */
export function validateM03Source(source: SourceRecord): Upstream {
  const upstream = M03Upstream.parse(source.body);
  if (upstream.m02Outcome !== "provisional_a" && upstream.m02Outcome !== "validated_a")
    throw new Error("Business Commitments requires a sealed Market Reality Outcome A");
  if (upstream.carriedForward.contrarianFlags.length)
    throw new Error("The sealed Market Reality flagged a potential contrarian trap — return to Founder Conviction");
  if (upstream.m01.lockState !== "locked")
    throw new Error("The Founder Conviction seal pinned by Market Reality is not locked");
  if (upstream.m01.sessionId !== upstream.m01Inputs.sessionId)
    throw new Error("M03 upstream M01 identity does not match its verbatim inputs");
  if (upstream.m01.sealedAt !== upstream.m01Inputs.sealedAt)
    throw new Error("M03 upstream M01 seal time does not match its verbatim inputs");
  return upstream;
}
