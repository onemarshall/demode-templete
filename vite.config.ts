import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { CSPDirectives } from "./csp.config.mjs";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
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
      alias: {
        scripts: "./src/assets/scripts",
        css: "./src/assets/css",
        svg: "./src/assets/svg",
        $lib: "./src/lib",
        "$lib/*": "./src/lib/*",
        "@/*": "./src/lib/*",
      },
    }),
  ],
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
});
