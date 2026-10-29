import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative, dirname } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const resourceRoot = resolve(root, "resources/strategy/system");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && !["archive", "archives", "_archive", "_archives"].includes(entry.name.toLowerCase()))
        found.push(...(await files(path)));
    } else if (
      entry.name.endsWith(".md") &&
      !entry.name.toLowerCase().includes("archive") &&
      !entry.name.toLowerCase().includes("prototype")
    ) found.push(path);
  }
  return found;
}
const documents = {};
const hashes = {};
for (const path of await files(resourceRoot)) {
  const bytes = await readFile(path);
  const key = relative(resourceRoot, path).replaceAll("\\", "/");
  documents[key] = bytes.toString("utf8");
  hashes[key] = sha(bytes);
}
const release = sha(JSON.stringify(hashes));
const manifest = { schemaVersion: 1, release, hashes };
const archivePath = resolve(resourceRoot, "archive.json");
let archive;
try {
  archive = JSON.parse(await readFile(archivePath, "utf8"));
} catch {
  throw new Error("Private method archive is missing or unreadable");
}
if (archive.schemaVersion !== 1 || !archive.releases || !archive.contents)
  throw new Error("Private method archive has an unsupported schema");
for (const [archivedRelease, archivedManifest] of Object.entries(archive.releases)) {
  if (
    archivedManifest.schemaVersion !== 1 ||
    archivedManifest.release !== archivedRelease ||
    sha(JSON.stringify(archivedManifest.hashes)) !== archivedRelease
  )
    throw new Error(`Private method archive manifest is invalid: ${archivedRelease}`);
  for (const [key, expected] of Object.entries(archivedManifest.hashes)) {
    const content = archive.contents[expected];
    if (typeof content !== "string" || sha(Buffer.from(content, "utf8")) !== expected)
      throw new Error(`Private method archive content is missing or altered: ${archivedRelease}/${key}`);
  }
}
for (const [key, content] of Object.entries(documents)) {
  const contentHash = hashes[key];
  const existing = archive.contents[contentHash];
  if (existing !== undefined && existing !== content)
    throw new Error(`Private method archive hash collision: ${key}`);
  archive.contents[contentHash] = content;
}
archive.releases[release] = manifest;
await writeFile(archivePath, JSON.stringify(archive, null, 2) + "\n");
const destination = resolve(root, "src/lib/modules/strategy/server/system.generated.ts");
await mkdir(dirname(destination), { recursive: true });
await writeFile(resolve(resourceRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(
  destination,
  "// Generated private method resources; import only from Strategy server code.\n" +
    "export const methodManifest = " +
    JSON.stringify(manifest, null, 2) +
    " as const;\n" +
    "export const methodReleaseManifests: Readonly<Record<string, { schemaVersion: number; release: string; hashes: Readonly<Record<string, string>> }>> = " +
    JSON.stringify(archive.releases, null, 2) +
    ";\n" +
    "export const methodContentPool: Readonly<Record<string, string>> = " +
    JSON.stringify(archive.contents, null, 2) +
    ";\n" +
    "export const methodDocuments: Readonly<Record<string, string>> = " +
    "Object.fromEntries(Object.entries(methodManifest.hashes).map(([path, contentHash]) => [path, methodContentPool[contentHash]]));\n",
);
console.log(`Packaged ${Object.keys(documents).length} private method resources across ${Object.keys(archive.releases).length} releases.`);
