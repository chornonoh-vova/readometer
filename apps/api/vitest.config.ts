import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "hono/bun": fileURLToPath(
        new URL("./test/shims/hono-bun.ts", import.meta.url),
      ),
    },
  },
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    pool: "forks",
    fileParallelism: false,
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/migrations/**",
        "src/lib/db.d.ts",
        "src/index.ts",
        "src/**/*.spec.ts",
      ],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 80,
        branches: 70,
      },
    },
  },
});
