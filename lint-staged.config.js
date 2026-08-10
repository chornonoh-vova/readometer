/** @type {import("lint-staged").Configuration} */
export default {
  "*": "prettier --write --ignore-unknown",
  // Function form drops the file list on purpose: each workspace has its own flat ESLint
  // config, so one root `eslint` spanning several fails with "multiple candidate
  // TSConfigRootDirs". Turbo fans out to the right workspaces instead.
  "*.{ts,tsx}": () => "bun run lint",
};
