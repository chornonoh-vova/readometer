import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/index.ts",
        "src/healthcheck.ts",
        "src/tailwind.config.ts",
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
