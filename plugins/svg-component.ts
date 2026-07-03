import { compile } from "svelte/compiler";
import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";

const COMPONENT_QUERY = "?component";
const SVG_SUFFIX = ".svg";
const XML_DECLARATION_RE = /<\?xml[^?]*\?>/g;
const DOCTYPE_RE = /<!DOCTYPE[^>[\]]*(?:\[[^\]]*\])?>/g;
const SVG_OPEN_TAG_RE = /<svg(\s|>)/;

type SvgTransformResult = {
  code: string;
  map: ReturnType<typeof compile>["js"]["map"];
};

const svgCache = new Map<string, SvgTransformResult>();

/**
 * Vite plugin that transforms SVG files imported with `?component`
 * into Svelte 5 components with prop spreading.
 *
 * Usage: `import Logo from 'svg/logo/logo.svg?component'`
 */
export default function svgComponent(): Plugin {
  return {
    name: "vite-svg-component",
    enforce: "pre" as const,

    async resolveId(source, importer, options) {
      if (!source.endsWith(`${SVG_SUFFIX}${COMPONENT_QUERY}`)) return null;
      const resolved = await this.resolve(source.slice(0, -COMPONENT_QUERY.length), importer, {
        ...options,
        skipSelf: true,
      });
      return resolved ? `${resolved.id}${COMPONENT_QUERY}` : null;
    },

    handleHotUpdate({ file, server }) {
      // Invalidate cache entries for this SVG so the next import recompiles.
      const key = `${file}${COMPONENT_QUERY}`;
      svgCache.delete(`${key}:client`);
      svgCache.delete(`${key}:server`);
      // Return the affected modules so Vite can propagate HMR to importers.
      const mod = server.moduleGraph.getModuleById(key);
      if (mod) return [mod];
    },

    async transform(_, id, options) {
      if (!id.endsWith(COMPONENT_QUERY)) return null;

      const filePath = id.slice(0, -COMPONENT_QUERY.length);
      if (!filePath.endsWith(SVG_SUFFIX)) return null;

      const generate = options?.ssr ? "server" : "client";
      const cacheKey = `${id}:${generate}`;

      if (svgCache.has(cacheKey)) {
        return svgCache.get(cacheKey)!;
      }

      const svgContent = (await readFile(filePath, "utf-8"))
        .replace(XML_DECLARATION_RE, "")
        .replace(DOCTYPE_RE, "")
        .trimStart();

      const svelteSource = `<script>
  let { ...props } = $props();
</script>
${svgContent.replace(SVG_OPEN_TAG_RE, "<svg {...props}$1")}`;

      const result = compile(svelteSource, {
        filename: filePath,
        generate,
        dev: false,
      });

      const compiled: SvgTransformResult = { code: result.js.code, map: result.js.map };

      svgCache.set(cacheKey, compiled);

      return compiled;
    },
  };
}
