# eslint-config

The repo's shared flat ESLint presets. Every workspace's `eslint.config.ts` is
a one-line re-export of one of them, so **rule changes belong here, not in a
consumer**:

| Preset                | Used by            | Adds to `base`                                         |
| --------------------- | ------------------ | ------------------------------------------------------ |
| `eslint-config/base`  | the two libraries  | `js` + `typescript-eslint` recommended, global ignores |
| `eslint-config/node`  | api, notifications | Node globals                                           |
| `eslint-config/react` | web                | react, react-hooks, TanStack Query, browser globals    |

```ts
// packages/isbn/eslint.config.ts
export { default } from "eslint-config/base";
```

Two things to know before editing:

- **This is the only workspace that declares the ESLint plugins.** Consumers
  declare just `eslint` (for the binary) and `eslint-config: "workspace:*"`.
  Adding a plugin to a consumer risks a `Cannot redefine plugin` failure at
  startup, because flat config identity-checks plugin instances and Bun's
  isolated linker can resolve one plugin to two store entries.
- **Global ignores (`dist`, `dev-dist`, `coverage`, `.turbo`) live in `base`**
  and are resolved against each _consumer's_ directory, which is why plain
  directory names are correct there. Workspace-specific ignores stay in the
  consumer — see `apps/web/eslint.config.ts`.

`lint` scripts run with `--max-warnings=0`, so anything set to `warn` here
fails CI just as loudly as an error.
