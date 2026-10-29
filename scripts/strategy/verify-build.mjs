import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const archive = JSON.parse(await readFile(resolve(root, "resources/strategy/system/archive.json"), "utf8"));
const fragments = Object.keys(archive.releases);
for (const content of Object.values(archive.contents)) {
  if (content.length >= 180) {
    const fragment = content.slice(0, 180);
    fragments.push(fragment, JSON.stringify(fragment).slice(1, -1));
  }
}
async function verify(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) await verify(path);
    else if (/\.(?:js|json|html|map)$/.test(item.name)) {
      const content = await readFile(path, "utf8");
      if (fragments.some((fragment) => content.includes(fragment)))
        throw new Error(`Private Strategy method content found in browser build: ${path}`);
    }
  }
}
await verify(resolve(root, ".svelte-kit/output/client"));
console.log("Private Strategy method resources are absent from the browser build.");
