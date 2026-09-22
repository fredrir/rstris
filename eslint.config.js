// @ts-check
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tailwindcss from "eslint-plugin-tailwindcss";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src-tauri/target", "tools/readme/dist", "tools/readme/node_modules"] },

  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,

  tailwindcss.configs.recommended,
  {
    settings: {
      tailwindcss: {
        cssConfigPath: fileURLToPath(new URL("./src/styles.css", import.meta.url)),
      },
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
    },
  },

  {
    files: ["*.config.{js,ts}", "vite.config.ts", "tools/readme/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ["tools/readme/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  prettier,
);
