import { createHash } from "node:crypto";
import { methodContentPool, methodManifest, methodReleaseManifests } from "./system.generated";

export const strategyMethodRelease = methodManifest.release;
function validRelease(release: string) {
  const manifest = methodReleaseManifests[release];
  return !!manifest && manifest.schemaVersion === 1 && manifest.release === release &&
    createHash("sha256").update(JSON.stringify(manifest.hashes)).digest("hex") === release;
}
/** Worker policy can reject a pinned method release before dispatch. */
export function hasStrategyMethodRelease(release: string): boolean {
  return validRelease(release);
}
/** Build-packaged private bytes work in Node workers and the host web runtime.
 * Historical jobs must name their release; no fallback to an unrelated current method.
 */
export function loadStrategyMethod(path: string, release: string = strategyMethodRelease): string {
  if (!validRelease(release)) throw new Error("Requested method release is not available in this build");
  const expected = methodReleaseManifests[release].hashes[path];
  const content = expected ? methodContentPool[expected] : undefined;
  if (!expected || content === undefined) throw new Error("Private method resource unavailable");
  if (createHash("sha256").update(content).digest("hex") !== expected)
    throw new Error("Private method resource integrity check failed");
  return content;
}
