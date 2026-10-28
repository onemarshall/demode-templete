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
    if (entry.isDirectory()) found.push(...(await files(path)));
    else if (entry.name.endsWith(".md")) found.push(path);
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
const destination = resolve(root, "src/lib/modules/strategy/server/system.generated.ts");
await mkdir(dirname(destination), { recursive: true });
await writeFile(resolve(resourceRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(
  destination,
  "// Generated private method resources; import only from Strategy server code.\n" +
    "export const methodManifest = " +
    JSON.stringify(manifest, null, 2) +
    " as const;\n" +
    "export const methodDocuments: Readonly<Record<string, string>> = " +
    JSON.stringify(documents, null, 2) +
    ";\n",
);
console.log(`Packaged ${Object.keys(documents).length} private method resources.`);
