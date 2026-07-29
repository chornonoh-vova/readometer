import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

/**
 * Every file every workspace lints. Exported so per-workspace configs can scope
 * overrides to the same set without redeclaring the glob.
 */
export const files = ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"];

/**
 * Build outputs and generated artifacts. These are global (not per-`files`)
 * ignores; ESLint resolves them against the *consuming* config file's
 * directory, so plain directory names are correct here.
 */
export const ignores = ["dist", "dev-dist", "coverage", ".turbo"];

export default defineConfig([
  globalIgnores(ignores),
  {
    name: "readometer/base",
    files,
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
]);
