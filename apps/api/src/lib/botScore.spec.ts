import { describe, it, expect } from "vitest";
import {
  BOT_SCORE_THRESHOLD,
  DEFAULT_BOT_SCORE_THRESHOLD,
  findAliasCollisions,
  parseBotScoreThreshold,
  gmailCanonical,
  scoreSignup,
} from "./botScore";

/**
 * The August 2026 campaign, verbatim. Every one of these is @gmail.com with a
 * name under FIELD_LIMITS.userName, which is why the original
 * `isDisposableEmailDomain || !isNameWithinLimit` filter matched none of them.
 */
const BOTS = [
  { name: "dsjkdsa", email: "dsajdjsdhsds@gmail.com" },
  { name: "wewewe", email: "rangsimanphu.n.a.s.r.i@gmail.com" },
  { name: "Zalupa Kube", email: "dsadas@gmail.com" },
  { name: "CUM", email: "bentieciac.ar.ey364.2@gmail.com" },
  {
    name: 'SEC<b>BOLD</b><i>ital</i><a href="https://evil.example">CLICK</a>',
    email: "craigjames.6.554.4@gmail.com",
  },
  {
    name: "wewewewewehongta.m.mit12.4.5@gmail.com",
    email: "hongta.m.mit12.4.5@gmail.com",
  },
  {
    name: "uaPool.random().toString();",
    email: "carriewat.so.n66.822@gmail.com",
  },
  { name: "I will destroy YOU", email: "roredmcdonal.d.2335@gmail.com" },
];

/**
 * Synthetic, but each row preserves a structural property of a real signup that
 * must never be blocked: a Cyrillic full name, a dotless gmail local part, a
 * local part made entirely of home-row letters, a bare given name, and a dotted
 * iCloud address (where dots are significant and carry no signal).
 */
const LEGITIMATE = [
  { name: "Оксана Шевченко", email: "shevchoks812@gmail.com" },
  { name: "Andrii Kovalenko", email: "wordsmithy@gmail.com" },
  { name: "Halyna Fedak", email: "hadasa5512@gmail.com" },
  { name: "Iryna", email: "iiryllarko@gmail.com" },
  { name: "Yaroslav Mudryi", email: "mudryi.yaroslav@icloud.com" },
];

describe("scoreSignup", () => {
  it.each(BOTS)("blocks $email", ({ name, email }) => {
    expect(scoreSignup(name, email).score).toBeGreaterThanOrEqual(
      BOT_SCORE_THRESHOLD,
    );
  });

  it.each(LEGITIMATE)("clears $email", ({ name, email }) => {
    expect(scoreSignup(name, email).score).toBe(0);
  });

  it("catches a real-looking name on a plain address via the wordlist", () => {
    // Nothing structural separates "Zalupa Kube" from a real name, and
    // dsadas@gmail.com is shaped like a legitimate address. The wordlist is the
    // only signal that reaches it.
    const result = scoreSignup("Zalupa Kube", "dsadas@gmail.com");
    expect(result.signals).toEqual(["name-profanity"]);
    expect(result.score).toBeGreaterThanOrEqual(BOT_SCORE_THRESHOLD);
  });
});

describe("certain signals", () => {
  it.each([
    'SEC<b>BOLD</b><a href="https://evil.example">CLICK</a>',
    "uaPool.random().toString();",
    "wewewewewehongta.m.mit12.4.5@gmail.com",
  ])("marks %s certain, so the OAuth path can block it too", (name) => {
    expect(scoreSignup(name, "someone@gmail.com").certain).toBe(true);
  });

  it.each(LEGITIMATE)("leaves $name uncertain", ({ name, email }) => {
    expect(scoreSignup(name, email).certain).toBe(false);
  });

  it("does not mark a merely fuzzy match certain", () => {
    const result = scoreSignup("wewewe", "rangsimanphu.n.a.s.r.i@gmail.com");
    expect(result.score).toBeGreaterThanOrEqual(BOT_SCORE_THRESHOLD);
    expect(result.certain).toBe(false);
  });
});

describe("email signals", () => {
  it("flags a gmail local part with a short dot segment", () => {
    expect(
      scoreSignup("Ann Lee", "roredmcdonal.d.2335@gmail.com").signals,
    ).toContain("email-short-dot-segment");
  });

  it("flags a heavily dotted gmail local part", () => {
    expect(scoreSignup("Ann Lee", "a.b.c.d.e@gmail.com").signals).toContain(
      "email-dot-heavy",
    );
  });

  it("applies the same rules to googlemail.com", () => {
    expect(
      scoreSignup("Ann Lee", "craigjames.6.554.4@googlemail.com").score,
    ).toBeGreaterThanOrEqual(BOT_SCORE_THRESHOLD);
  });

  it("ignores dots on iCloud, where they are significant", () => {
    expect(scoreSignup("Ann Lee", "a.b.c.d.e@icloud.com").score).toBe(0);
  });

  it("ignores dots on a Workspace domain reached through Google OAuth", () => {
    expect(scoreSignup("Ann Lee", "a.b.c.d.e@some-company.com").score).toBe(0);
  });

  it("does not flag a two-part gmail local part with substantial segments", () => {
    expect(scoreSignup("Ann Lee", "chornonoh.vova@gmail.com").score).toBe(0);
  });
});

describe("keyboard mash detection", () => {
  it("flags an all-home-row single token", () => {
    expect(scoreSignup("dsjkdsa", "a@gmail.com").signals).toContain(
      "name-keyboard-mash",
    );
  });

  it("does not flag a multi-word name whose parts sit on the home row", () => {
    // "Sahan" alone is 80% home row; only single-token names are tested.
    expect(scoreSignup("Daria Sahan", "a@gmail.com").signals).not.toContain(
      "name-keyboard-mash",
    );
  });

  it("does not flag a short given name", () => {
    expect(scoreSignup("Olha", "a@gmail.com").signals).not.toContain(
      "name-keyboard-mash",
    );
  });

  it("never applies to the email local part", () => {
    // hadasa5512 is entirely home-row letters and belongs to a real person.
    expect(scoreSignup("Halyna Fedak", "hadasa5512@gmail.com").score).toBe(0);
  });
});

describe("consonant run detection", () => {
  it("flags a long consonant run", () => {
    expect(scoreSignup("dsjkdsa", "a@gmail.com").signals).toContain(
      "name-consonant-run",
    );
  });

  it("treats y as a vowel so Slavic names survive", () => {
    expect(
      scoreSignup("Volodymyr Chornonoh", "a@gmail.com").signals,
    ).not.toContain("name-consonant-run");
  });

  it("does not treat Cyrillic letters as consonants", () => {
    expect(scoreSignup("Оксана Шевченко", "a@gmail.com").signals).not.toContain(
      "name-consonant-run",
    );
  });
});

describe("repeated n-gram detection", () => {
  it("flags a bigram repeated three times", () => {
    expect(scoreSignup("wewewe", "a@gmail.com").signals).toContain(
      "name-repeated-ngram",
    );
  });

  it("does not flag an ordinary name with a doubled letter", () => {
    expect(scoreSignup("Anna Bennett", "a@gmail.com").signals).not.toContain(
      "name-repeated-ngram",
    );
  });
});

describe("profanity wordlist", () => {
  it.each(["Zalupa Kube", "CUM", "залупа"])("flags %s", (name) => {
    expect(scoreSignup(name, "a@gmail.com").signals).toContain(
      "name-profanity",
    );
  });

  it("splits on punctuation, not just whitespace", () => {
    expect(scoreSignup("Zalupa_Kube", "a@gmail.com").signals).toContain(
      "name-profanity",
    );
  });

  // Whole-token matching only. Substring matching rejects real people - this is
  // the Scunthorpe problem, and at weight 3 a hit blocks on its own.
  it.each([
    "Anna Cummings",
    "Richard Dickinson",
    "Immanuel Kant",
    "Nguyen Van Phuc",
    "Wang Dong",
    "Scott Cocker",
    "Penny Assange",
  ])("does not flag %s", (name) => {
    expect(scoreSignup(name, "a@gmail.com").signals).not.toContain(
      "name-profanity",
    );
  });

  // These are real given names and surnames, so they stay off the list even
  // though a substring filter would catch them.
  it.each([
    "Dick Sanders",
    "Gay Talese",
    "Randy Ho",
    "Nguyen Van Huy",
    "Li Hui",
    "Abba Eban",
    "James Gandon",
    "Manda Patel",
  ])("does not flag %s, which is a real name", (name) => {
    expect(scoreSignup(name, "a@gmail.com").signals).not.toContain(
      "name-profanity",
    );
  });

  it("is not certain, so Google sign-up stays open to a false positive", () => {
    expect(scoreSignup("Zalupa Kube", "a@gmail.com").certain).toBe(false);
  });
});

describe("gmailCanonical", () => {
  it("strips dots so an alias collapses onto its mailbox", () => {
    expect(gmailCanonical("craig.james.6@gmail.com")).toBe(
      "craigjames6@gmail.com",
    );
  });

  it("strips a plus tag", () => {
    expect(gmailCanonical("craigjames6+readometer@gmail.com")).toBe(
      "craigjames6@gmail.com",
    );
  });

  it("folds googlemail.com onto gmail.com", () => {
    expect(gmailCanonical("craigjames6@googlemail.com")).toBe(
      "craigjames6@gmail.com",
    );
  });

  it("collapses every address in the campaign onto one mailbox", () => {
    const aliases = [
      "craigjames.6.554.4@gmail.com",
      "c.r.a.i.g.j.a.m.e.s.6.5.5.4.4@gmail.com",
      "CraigJames65544@GMail.com",
    ];
    expect(new Set(aliases.map(gmailCanonical)).size).toBe(1);
  });

  it("returns null for a provider where dots are significant", () => {
    expect(gmailCanonical("first.last@icloud.com")).toBeNull();
  });
});

describe("findAliasCollisions", () => {
  it("groups accounts sharing one Gmail mailbox", () => {
    const groups = findAliasCollisions([
      { id: "1", email: "craigjames.6.554.4@gmail.com" },
      { id: "2", email: "c.r.a.i.g.james65544@gmail.com" },
      { id: "3", email: "someoneelse@gmail.com" },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((u) => u.id)).toEqual(["1", "2"]);
  });

  it("leaves distinct mailboxes alone", () => {
    expect(
      findAliasCollisions([
        { id: "1", email: "shevchoks812@gmail.com" },
        { id: "2", email: "wordsmithy@gmail.com" },
      ]),
    ).toEqual([]);
  });

  it("does not group iCloud addresses differing only by dots", () => {
    expect(
      findAliasCollisions([
        { id: "1", email: "first.last@icloud.com" },
        { id: "2", email: "firstlast@icloud.com" },
      ]),
    ).toEqual([]);
  });
});

describe("parseBotScoreThreshold", () => {
  it.each([undefined, "", "   "])("falls back to the default for %p", (raw) => {
    expect(parseBotScoreThreshold(raw)).toBe(DEFAULT_BOT_SCORE_THRESHOLD);
  });

  it("takes an override", () => {
    expect(parseBotScoreThreshold("5")).toBe(5);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseBotScoreThreshold(" 5 ")).toBe(5);
  });

  it("allows a threshold high enough to disable the gate", () => {
    expect(parseBotScoreThreshold("999")).toBe(999);
  });

  // Silently defaulting would leave an operator believing they had raised the
  // threshold while every signup was still being scored against 3.
  it.each(["0", "-1", "2.5", "abc", "3abc"])(
    "throws rather than defaulting on %p",
    (raw) => {
      expect(() => parseBotScoreThreshold(raw)).toThrow(/BOT_SCORE_THRESHOLD/);
    },
  );

  it("is what BOT_SCORE_THRESHOLD resolves to when the var is unset", () => {
    expect(BOT_SCORE_THRESHOLD).toBe(DEFAULT_BOT_SCORE_THRESHOLD);
  });
});
