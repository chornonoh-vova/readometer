import react from "eslint-config/react";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Both are web-specific generated output: vite-plugin-pwa's dev build, and
  // TanStack Router's generated route tree (tracked, so not covered by git).
  globalIgnores(["dev-dist", "src/routeTree.gen.ts"]),
  ...react,
]);
