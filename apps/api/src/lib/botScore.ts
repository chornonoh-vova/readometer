/**
 * Scores a signup on how much it looks like the August 2026 bot campaign.
 *
 * Every account in that campaign was @gmail.com with a short name, so the
 * original `isDisposableEmailDomain || !isNameWithinLimit` filter matched none
 * of them. The signals here are lexical only - no DB access, no extra query on
 * the signup path. Alias-collision detection needs the whole user table and
 * lives in scripts/purge-bot-accounts.ts instead.
 *
 * Signals are weighted rather than absolute because no single one is decisive.
 * `certain` marks the subset that no real name can trip, which is what the
 * Google OAuth path checks - see the note in auth.ts about why that path gets
 * lighter treatment.
 */
import { emailDomain } from "./accountPolicy.ts";
import { PROFANITY } from "./profanity.ts";

/**
 * Where the threshold sits when BOT_SCORE_THRESHOLD is unset. Chosen against
 * the campaign sample: "I will destroy YOU" scores exactly 3 off a single
 * signal, so 4 loses it.
 */
export const DEFAULT_BOT_SCORE_THRESHOLD = 3;

/**
 * Throws rather than defaulting on a bad value. A silent fallback would leave
 * an operator who fat-fingered the variable believing they had retuned the gate
 * while every signup was still scored against the default.
 */
export function parseBotScoreThreshold(raw: string | undefined): number {
  const value = raw?.trim();
  if (!value) return DEFAULT_BOT_SCORE_THRESHOLD;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `BOT_SCORE_THRESHOLD must be an integer of at least 1, got ${JSON.stringify(raw)}`,
    );
  }

  return parsed;
}

/**
 * A signup scoring at or above this is rejected. Read once at startup, so
 * retuning it is a restart rather than a deploy.
 */
export const BOT_SCORE_THRESHOLD = parseBotScoreThreshold(
  process.env.BOT_SCORE_THRESHOLD,
);

export type SignupScore = {
  score: number;
  signals: string[];
  /** At least one signal no legitimate name or address can produce. */
  certain: boolean;
};

/**
 * The only providers whose dots carry no meaning: Gmail routes every dotted
 * spelling of a local part to one mailbox, so an attacker mints unlimited
 * distinct-looking addresses from a single account. Everywhere else - iCloud
 * included - dots are significant and say nothing about the signup.
 */
const DOT_INSENSITIVE_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
]);

/** Markup and code punctuation. No human name contains any of these. */
const CODE_CHARS = /[<>{}[\]();=|\\/$`"]/;

/** Letters of any script, combining marks, and the punctuation names use. */
const NAME_CHARS = /^[\p{L}\p{M} '.-]+$/u;

const HOME_ROW = new Set("asdfghjkl");

/**
 * `y` counts as a vowel. Treating it as a consonant makes "Volodymyr" a
 * five-consonant run, which is a false positive on a common Ukrainian name.
 */
const VOWELS = new Set("aeiouy");

type Signal = { id: string; weight: number; certain?: true };

function localPart(email: string): string {
  const at = email.lastIndexOf("@");
  return (at < 0 ? email : email.slice(0, at)).trim().toLowerCase();
}

/**
 * Letter runs, so "Zalupa_Kube" and "Zalupa1Kube" split the same way "Zalupa
 * Kube" does. Whole tokens are what the wordlist matches against - see the note
 * in profanity.ts about why substring matching is not an option.
 */
function letterTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
}

function alphanumeric(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Canonical mailbox behind a Gmail alias, or null for providers where the
 * address is already canonical. Two accounts sharing a return value are one
 * person.
 */
export function gmailCanonical(email: string): string | null {
  if (!DOT_INSENSITIVE_DOMAINS.has(emailDomain(email))) return null;

  const [beforeTag = ""] = localPart(email).split("+");
  return `${beforeTag.replaceAll(".", "")}@gmail.com`;
}

/** A bigram or trigram repeated three times back to back, as in "wewewe". */
function hasRepeatedNgram(token: string): boolean {
  for (const size of [2, 3]) {
    for (let i = 0; i + size * 3 <= token.length; i++) {
      const unit = token.slice(i, i + size);
      if (token.slice(i, i + size * 3) === unit.repeat(3)) return true;
    }
  }
  return false;
}

/**
 * Home-row hammering, as in "dsjkdsa" and "dsadas". Restricted to single-token
 * names: "Sahan" on its own is 80% home row, so checking each word of "Daria
 * Sahan" separately would reject a real user. Never applied to the email local
 * part for the same reason - "hadasa5512" is entirely home-row letters.
 */
function isKeyboardMash(name: string): boolean {
  const token = name.trim().toLowerCase();
  if (token.length < 5 || !/^\p{L}+$/u.test(token)) return false;

  const onHomeRow = [...token].filter((char) => HOME_ROW.has(char)).length;
  return onHomeRow / token.length >= 0.8;
}

/** Longest run of consecutive ASCII consonants. Non-ASCII letters break runs. */
function longestConsonantRun(name: string): number {
  let longest = 0;
  let run = 0;

  for (const char of name.toLowerCase()) {
    if (char >= "a" && char <= "z" && !VOWELS.has(char)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  return longest;
}

function nameSignals(name: string, email: string): Signal[] {
  const signals: Signal[] = [];
  const words = name.trim().split(/\s+/).filter(Boolean);
  const local = alphanumeric(localPart(email));

  if (CODE_CHARS.test(name)) {
    signals.push({ id: "name-markup", weight: 5, certain: true });
  }
  if (name.includes("@")) {
    signals.push({ id: "name-contains-at", weight: 5, certain: true });
  }
  if (local.length >= 6 && alphanumeric(name).includes(local)) {
    signals.push({ id: "name-echoes-email", weight: 3 });
  }
  if (!NAME_CHARS.test(name)) {
    signals.push({ id: "name-charset", weight: 2 });
  }
  // Not `certain`: a wordlist is exactly the kind of signal that should leave
  // Google sign-up open to whoever it misjudges.
  if (letterTokens(name).some((token) => PROFANITY.has(token))) {
    signals.push({ id: "name-profanity", weight: 3 });
  }
  if (words.some((word) => hasRepeatedNgram(alphanumeric(word)))) {
    signals.push({ id: "name-repeated-ngram", weight: 3 });
  }
  if (words.length === 1 && isKeyboardMash(name)) {
    signals.push({ id: "name-keyboard-mash", weight: 3 });
  }
  if (longestConsonantRun(name) >= 4) {
    signals.push({ id: "name-consonant-run", weight: 2 });
  }
  if (name.length >= 3 && name === name.toUpperCase() && /\p{L}/u.test(name)) {
    signals.push({ id: "name-all-caps", weight: 2 });
  }
  if (words.length > 4) {
    signals.push({ id: "name-too-many-words", weight: 2 });
  }
  if (
    words.length === 1 &&
    name === name.toLowerCase() &&
    /\p{L}/u.test(name)
  ) {
    signals.push({ id: "name-lowercase-single", weight: 1 });
  }

  return signals;
}

function emailSignals(email: string): Signal[] {
  if (!DOT_INSENSITIVE_DOMAINS.has(emailDomain(email))) return [];

  const segments = localPart(email).split(".");
  if (segments.length < 2) return [];

  const signals: Signal[] = [];

  // A real Gmail address is one word, occasionally two. Segments this short are
  // the aliasing trick: "roredmcdonal.d.2335" is one mailbox wearing a costume.
  if (segments.some((segment) => segment.length <= 2)) {
    signals.push({ id: "email-short-dot-segment", weight: 3 });
  }
  if (segments.length - 1 >= 3) {
    signals.push({ id: "email-dot-heavy", weight: 2 });
  }

  return signals;
}

export function scoreSignup(name: string, email: string): SignupScore {
  const signals = [...nameSignals(name, email), ...emailSignals(email)];

  return {
    score: signals.reduce((total, signal) => total + signal.weight, 0),
    signals: signals.map((signal) => signal.id),
    certain: signals.some((signal) => signal.certain === true),
  };
}

/**
 * Accounts that share a canonical Gmail mailbox, grouped. Too expensive for the
 * signup path - it needs every user - but free in the purge script, which loads
 * the table anyway. Two rows in a group are one person with two accounts.
 */
export function findAliasCollisions<T extends { email: string }>(
  users: readonly T[],
): T[][] {
  const byMailbox = new Map<string, T[]>();

  for (const user of users) {
    const mailbox = gmailCanonical(user.email);
    if (!mailbox) continue;

    const group = byMailbox.get(mailbox);
    if (group) group.push(user);
    else byMailbox.set(mailbox, [user]);
  }

  return [...byMailbox.values()].filter((group) => group.length > 1);
}
