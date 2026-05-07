import { HTTPException } from "hono/http-exception";

// IANA timezones that the JS Intl runtime (ICU/CLDR) still surfaces under their
// legacy names — most notably from `Intl.DateTimeFormat().resolvedOptions().timeZone`
// in browsers — but that recent Postgres tzdata no longer recognises. Map each
// to the canonical name Postgres knows so `AT TIME ZONE <name>` does not 500.
const TZ_ALIASES: Record<string, string> = {
  "Europe/Kiev": "Europe/Kyiv",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
};

export function canonicalizeTz(tz: string): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    throw new HTTPException(400, { message: "Invalid timezone" });
  }
  return TZ_ALIASES[tz] ?? tz;
}
