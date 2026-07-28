# apps/web

React 19 + Vite SPA/PWA.

- TanStack Router with file-based routing under `src/routes/`. The `_auth/` group guards
  all app routes; `_auth/_app.tsx` is the app shell with the sidebar and reading session
  overlay.
- TanStack Query for server state. Query keys are centralized in `src/lib/query-keys.ts` —
  add new keys there rather than inlining them, and have mutations invalidate the relevant
  keys.
- Per-resource hooks live in `src/lib/` (e.g. `books.ts`, `reading-sessions.ts`) and own
  both fetching and mutations for that resource.
- TanStack Form + Zod for all form handling and client-side validation.
- Zustand (`src/store/reading-session.ts`) persists the active reading session to
  `localStorage`.
- The dev server proxies `/api` → `http://localhost:3000`, so `apps/api` must be running
  too.
