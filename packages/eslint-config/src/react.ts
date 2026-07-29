import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import query from "@tanstack/eslint-plugin-query";
import { defineConfig } from "eslint/config";
import base from "./base.ts";

// `eslint-plugin-react` types `configs.flat` as an open `Record<string, …>`, so
// nothing in its types guarantees these presets exist. Destructure and check so
// a missing preset names itself, instead of surfacing as a config-load TypeError.
// `jsx-runtime` is required because every consumer sets `jsx: "react-jsx"` — it
// turns off react-in-jsx-scope and jsx-uses-react.
const { recommended, "jsx-runtime": jsxRuntime } = react.configs.flat;
if (!recommended || !jsxRuntime) {
  throw new Error("eslint-plugin-react: missing flat config preset");
}

export default defineConfig([
  ...base,
  {
    name: "readometer/react",
    extends: [
      recommended,
      jsxRuntime,
      reactHooks.configs.flat.recommended,
      query.configs["flat/recommended"],
    ],
    languageOptions: { globals: globals.browser },
    settings: {
      // `"detect"` is not an option: it crashes on ESLint 10, because the
      // plugin's version.js calls `context.getFilename()`, removed in v10.
      // Keep in step with the root package.json catalog's `react` entry.
      react: { version: "19.2" },
    },
    rules: {
      // TypeScript already enforces component prop shapes.
      "react/prop-types": "off",
      // TanStack Form's `children` is a required function-typed prop, so the
      // `<form.Field name="…" children={(field) => …} />` render-prop form is
      // idiomatic — exactly what this option exists for.
      "react/no-children-prop": ["error", { allowFunctions: true }],
    },
  },
]);
