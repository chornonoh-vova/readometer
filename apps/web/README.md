# @readometer/web

The Readometer frontend: a React 19 single-page PWA built with Vite and
Tailwind CSS v4, talking to the Hono API under `/api`.

## Stack

- **Framework**: React 19 + Vite 8
- **Routing**: [TanStack Router](https://tanstack.com/router) (file-based,
  with auto code-splitting via `@tanstack/router-plugin`)
- **Data fetching**: [TanStack Query](https://tanstack.com/query) over a
  thin `fetchApi` wrapper (`src/lib/api.ts`)
- **Forms**: [TanStack Form](https://tanstack.com/form) + Zod
- **State**: [Zustand](https://zustand.docs.pmnd.rs) with `persist` for
  the in-progress reading session (`src/store/reading-session.ts`)
- **UI**: Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com) (config in
  `components.json`), Base UI, Lucide icons, `next-themes`, `sonner`,
  `vaul`, Motion
- **Auth**: `better-auth/react` client against the API's `/api/auth/*`
  routes
- **Captcha**: `@marsidev/react-turnstile` on login and registration
- **PWA**: `vite-plugin-pwa` with `autoUpdate` registration and icons
  generated from `public/readometer.svg`

## File layout

```
src/
├── main.tsx                 # Router + QueryClient + ThemeProvider boot
├── routes/
│   ├── __root.tsx           # Root layout (Outlet + Toaster)
│   ├── login.tsx            # /login
│   ├── register.tsx         # /register
│   └── _auth/
│       ├── route.tsx        # Auth guard
│       ├── _app.tsx         # App shell: sidebar + current reading session
│       ├── _app.index.tsx   # /            — books list
│       ├── _app.activity.tsx           # /activity — yearly heatmap
│       └── _app.books.$bookId.tsx      # /books/:bookId — details, runs, sessions
├── components/              # App + shadcn/ui components
├── hooks/                   # use-mobile, use-local-storage
├── lib/                     # api client, books, reading-runs, sessions, formatting, bucket
└── store/reading-session.ts # persistent Zustand store
```

The reading session store is persisted to localStorage under the
`reading-session` key, so a timer survives page reloads and offline
intervals.

## Scripts

```sh
bun run dev                   # vite dev server on :5173
bun run build                 # tsc -b && vite build
bun run preview               # vite preview
bun run typecheck             # tsc --noEmit
bun run lint                  # eslint .
bun run test                  # vitest
bun run fmt                   # prettier --write .
bun run generate-pwa-assets   # regenerate PWA icons from readometer.svg
```

During `dev`, Vite proxies `/api` to `http://localhost:3000` (see
`vite.config.ts`), so you can run the web app without CORS configuration.

## Environment variables

See `sample.env`. Only one build-time variable is needed:

| Variable                  | Required | Description                     |
| ------------------------- | -------- | ------------------------------- |
| `VITE_TURNSTILE_SITE_KEY` | yes      | Cloudflare Turnstile site key   |

The sample value is Cloudflare's always-passing testing key.

## Docker

`Dockerfile` is a multi-stage build: `turbo prune web --docker` produces a
pruned context, the `builder` stage runs `bun turbo build --filter=web`
with `VITE_TURNSTILE_SITE_KEY` mounted as a build secret, and the final
image serves `dist/` through Nginx. `nginx.conf` long-caches assets under
`/assets/` and `/workbox-*`, and falls back to `index.html` for SPA
routing.
