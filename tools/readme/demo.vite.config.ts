import { fileURLToPath } from "node:url";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const MOCK_ID = "\0rstris-readme-mock-ipc";
const MOCK_MODULE = "/tools/readme/mockIpc.ts";

/**
 * Swaps the Tauri IPC layer for the browser replay mock so the README capture
 * build can run the real UI without the desktop runtime.
 */
function mockIpc(): Plugin {
  return {
    name: "rstris-readme-mock-ipc",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "./ipc" || source.endsWith("/ipc")) {
        if (importer?.includes("/src/")) return MOCK_ID;
      }
      return null;
    },
    load(id) {
      if (id === MOCK_ID) return `export * from ${JSON.stringify(MOCK_MODULE)};`;
      return null;
    },
  };
}

export default defineConfig({
  root,
  plugins: [mockIpc(), react(), tailwindcss()],
  publicDir: path.resolve(here, "public"),
  build: {
    outDir: path.resolve(here, "dist"),
    emptyOutDir: true,
  },
});
