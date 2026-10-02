import "dotenv/config";
import { defineConfig, type ViteUserConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { CSPDirectives } from "./csp.config.mjs";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Logger, Plugin } from "vite";

const patchedConsoles = new WeakSet<typeof console>();
const patchedLoggers = new WeakSet<Logger>();
const originalLoggerInfos = new WeakMap<Logger, (...args: unknown[]) => void>();

function suppressDataRequestLogs(): Plugin {
  return {
    name: "suppress-data-request-logs",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      const { logger } = server.config;
      if (!patchedLoggers.has(logger)) {
        patchedLoggers.add(logger);
        const originalInfo = (logger.info as (...args: unknown[]) => void).bind(logger);
        originalLoggerInfos.set(logger, originalInfo);
        const wrappedInfo: (...args: unknown[]) => void = (...args) => {
          if (typeof args[0] === "string" && args[0].includes("__data.json")) return;
          originalInfo(...args);
        };
        logger.info = wrappedInfo as unknown as Logger["info"];
      }

      if (patchedConsoles.has(console)) return;
      patchedConsoles.add(console);
      const originalLog = console.log.bind(console);
      console.log = (...args: unknown[]) => {
        if (typeof args[0] === "string" && args[0].includes("__data.json")) return;
        originalLog(...args);
      };
      return () => {
        console.log = originalLog;
        patchedConsoles.delete(console);
        const restoreInfo = originalLoggerInfos.get(logger);
        if (restoreInfo) {
          logger.info = restoreInfo as unknown as Logger["info"];
          originalLoggerInfos.delete(logger);
          patchedLoggers.delete(logger);
        }
      };
    },
  };
}

const cwd = path.dirname(fileURLToPath(import.meta.url));

// Public origin served through the Cloudflare Tunnel (e.g. https://oae.austinmarshall.co.uk)
const siteUrl = process.env.PUBLIC_SITE_URL;
const siteOrigin = siteUrl ? new URL(siteUrl).origin : undefined;
const siteHost = siteOrigin ? new URL(siteOrigin).hostname : undefined;

export default defineConfig({
  plugins: [
    suppressDataRequestLogs(),
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
        experimental: { async: true },
      },
      adapter: adapter({
        // See below for an explanation of these options
        config: undefined,
        platformProxy: {
          configPath: undefined,
          environment: undefined,
          persist: undefined,
        },
        fallback: "plaintext",
        routes: {
          include: ["/*"],
          exclude: ["<all>"],
        },
      }),
      experimental: {
        remoteFunctions: true,
        forkPreloads: true,
      },
      csp: {
        mode: "auto",
        directives: CSPDirectives(),
      },
      csrf: {
        // Allow form/remote-function POSTs arriving via the tunnel's https origin
        trustedOrigins: siteOrigin ? [siteOrigin] : [],
      },
    }),
  ],
  server: {
    port: 7000,
    // Bind all interfaces so Docker-based cloudflared can reach us via host.docker.internal
    host: true,
    // Allow the tunnel hostname through Vite's dev-server host check.
    // ".trycloudflare.com" covers quick tunnels; siteHost covers named tunnels.
    allowedHosts: siteHost ? [siteHost, ".trycloudflare.com"] : [".trycloudflare.com"],
  },
  build: {
    rollupOptions: {
      plugins: [
        visualizer({
          filename: "stats.md",
          template: "markdown",
          open: false,
          gzipSize: true,
          brotliSize: true,
          // oxlint-disable-next-line no-explicit-any
        }) as any,
      ],
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve(cwd, "./src/lib"),
      css: path.resolve(cwd, "./src/assets/css"),
      "@vinejs/vine": path.resolve(cwd, "./src/lib/utils/stub-vine.ts"),
    },
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", headless: true }],
          },
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**"],
        },
      },

      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
} as ViteUserConfig);
