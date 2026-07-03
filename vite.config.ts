import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { CSPDirectives } from "./csp.config.mjs";

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
        handleRenderingErrors: true,
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
        "@/*": "./src/lib/*",
      },
    }),
  ],
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
