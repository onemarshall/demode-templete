import { createHash } from "node:crypto";
import { methodDocuments, methodManifest } from "./system.generated";

export const strategyMethodRelease = methodManifest.release;
/** Build-packaged private bytes work in Node workers and the host web runtime.
 * Historical jobs must name their release; no fallback to an unrelated current method.
 */
export function loadStrategyMethod(path: string, release = strategyMethodRelease): string {
  if (release !== strategyMethodRelease)
    throw new Error("Requested method release is not available in this build");
  const expected = (methodManifest.hashes as Readonly<Record<string, string>>)[path];
  const content = methodDocuments[path];
  if (!expected || content === undefined) throw new Error("Private method resource unavailable");
  if (createHash("sha256").update(content).digest("hex") !== expected)
    throw new Error("Private method resource integrity check failed");
  return content;
}
