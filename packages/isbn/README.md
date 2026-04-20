# isbn

Shared ISBN utilities used by both `apps/api` and `apps/web`. Small,
dependency-light (just Zod), and fully covered by Vitest.

## What it does

- Strip separators and uppercase the check digit (`978-1-60309-452-8` →
  `9781603094528`)
- Validate ISBN-10 and ISBN-13 check digits
- Convert a valid ISBN-10 to its ISBN-13 equivalent
- Normalize any valid ISBN input to ISBN-13, returning `null` for
  anything that can't be validated
- Expose a Zod schema (`isbnSchema`) that accepts ISBN-10, ISBN-13, or an
  empty string

All books in the API are stored as ISBN-13 (`char(13)`), so incoming
ISBN-10 values are upgraded at the boundary via `normalizeIsbnToIsbn13`.

## Usage

The package is workspace-internal (`"private": true`) and consumed via
Bun workspaces:

```jsonc
// apps/api/package.json
"dependencies": {
  "isbn": "workspace:*"
}
```

```ts
import {
  isbnSchema,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbnToIsbn13,
  stripIsbn,
  isbn10ToIsbn13,
} from "isbn";

normalizeIsbnToIsbn13("0-306-40615-2");
// → "9780306406157"

normalizeIsbnToIsbn13("not an isbn");
// → null

isbnSchema.safeParse("9780306406157").success;
// → true
```

## API

| Export                  | Signature                                   | Notes                                              |
| ----------------------- | ------------------------------------------- | -------------------------------------------------- |
| `stripIsbn`             | `(input: string) => string`                 | Removes spaces/hyphens and uppercases the input.   |
| `isValidIsbn10`         | `(isbn10: string) => boolean`               | Checks the mod-11 check digit (accepts `X`).       |
| `isValidIsbn13`         | `(isbn13: string) => boolean`               | Checks the mod-10 weighted check digit.            |
| `isbn10ToIsbn13`        | `(isbn10: string) => string`                | Prefixes `978` and recomputes the check digit.     |
| `normalizeIsbnToIsbn13` | `(input?: string \| null) => string \| null`| Strips, validates, and upgrades ISBN-10 → ISBN-13. |
| `isbnSchema`            | `z.ZodString`                               | Refinement: empty or a valid ISBN-10/13.           |

## Scripts

```sh
bun run test        # vitest
bun run typecheck   # tsc --noEmit
```
