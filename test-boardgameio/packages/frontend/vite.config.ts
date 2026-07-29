// @ts-nocheck
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths"; // 👈 Import it

/**
 * Vite's dev server sends `Cache-Control: no-cache` for everything in
 * `public/`, so every preloaded asset still costs a revalidation round-trip the
 * next time it's used — 118 of them, which looks and feels like a re-download.
 * Static art here never changes mid-session, so let the browser keep it.
 *
 * Dev only: production caching is the host's business, and `apply: "serve"`
 * keeps this out of the build.
 */
const cacheStaticAssets = () => ({
  name: "cache-static-assets",
  apply: "serve" as const,
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    cacheStaticAssets(),
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    watch: {
      usePolling: true
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
