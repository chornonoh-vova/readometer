# typescript-config

The repo's shared `tsconfig` presets. Every `tsconfig.json` in the monorepo is
an `extends` of one of these plus, at most, its own `types`, `paths`, and
`include` — so **compiler-option changes belong here, not in a consumer**:

| Preset       | Used by                      | What it is                           |
| ------------ | ---------------------------- | ------------------------------------ |
| `base.json`  | everything                   | ESNext, `module: "Preserve"`, strict |
| `react.json` | `apps/web/tsconfig.app.json` | `base` + DOM libs + `vite/client`    |

```jsonc
// apps/api/tsconfig.json
{
  "extends": "typescript-config/base.json",
  "compilerOptions": { "types": ["bun"] },
}
```

Why so little lives in the presets:

- **Relative paths must stay in the consumer.** TypeScript resolves `include`,
  `exclude`, and `paths` against the file that _declares_ them, so anything
  hoisted here would resolve against `packages/typescript-config/`. Only
  environment-describing options (`lib`, the strictness flags) are shared.
- **`types` mostly stays in the consumer too.** `extends` _replaces_ arrays
  rather than merging them, so a `base.json` that set `types: ["bun"]` could
  not be extended by `apps/notifications`, which needs `["bun", "nodemailer"]`.
- Consumers `extends` the **file path** (`typescript-config/base.json`), not a
  bare subpath: the package intentionally has no `exports` map, so `extends`
  resolves as a plain file lookup through the workspace symlink.

Notable settings, since they bite repo-wide: `erasableSyntaxOnly` makes `enum`,
`namespace`, and constructor parameter properties compile errors everywhere;
`noUnusedLocals`/`noUnusedParameters` mean an unused local fails both
`typecheck` and `lint`; and `incremental` is on with no `tsBuildInfoFile`, so
each consumer writes `<config>.tsbuildinfo` beside its own tsconfig — gitignored,
and declared as a turbo `outputs` glob so the cache round-trips.
