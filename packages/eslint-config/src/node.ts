import globals from "globals";
import { defineConfig } from "eslint/config";
import base from "./base.ts";

export default defineConfig([
  ...base,
  { name: "readometer/node", languageOptions: { globals: globals.node } },
]);
