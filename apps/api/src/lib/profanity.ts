/**
 * Slurs and obscenities that are never a real name, matched as whole tokens by
 * the `name-profanity` signal in botScore.ts.
 *
 * Weighted at the block threshold on its own, so a false positive here rejects
 * a real person outright. That constrains the list in two ways.
 *
 * First, entries must be words no parent gives a child and no registry issues
 * as a surname. Words that are merely rude in some context do not qualify.
 *
 * Second - and this is what the tests in botScore.spec.ts guard - matching is
 * whole-token, never substring. `Cummings`, `Dickinson`, `Cocker`, `Assange`,
 * and `Scunthorpe` all survive because of that. The following are deliberately
 * ABSENT for the same reason, and must stay absent: dick, cock, gay, ho, wang,
 * dong, phuc, kant, bush, cox, fanny, willy, randy, peter, johnson, hoare,
 * butt, cumming, suka, huy, hui, eban, gandon, manda. Every one is a real given
 * name or surname somewhere - Huy and Hui especially, being among the most
 * common given names in Vietnam and China respectively.
 *
 * Heavy on Russian and Ukrainian, in both Cyrillic and Latin transliteration,
 * because that is what the observed campaigns used.
 */
export const PROFANITY: ReadonlySet<string> = new Set([
  // Russian / Ukrainian, transliterated
  "zalupa",
  "zalupka",
  "pizda",
  "pizdec",
  "pizdets",
  "huj",
  "xuy",
  "xuj",
  "khuy",
  "huyna",
  "huynya",
  "blya",
  "blyat",
  "blyad",
  "ebat",
  "yebat",
  "ebal",
  "yebal",
  "yeban",
  "yobana",
  "ebuchiy",
  "mudak",
  "mudila",
  "pidor",
  "pidoras",
  "pidr",
  "pedik",
  "gondon",
  "govno",
  "gavno",
  "dolboeb",
  "dolboyeb",
  "dolbaeb",
  "zhopa",
  "jopa",
  "sraka",
  "drochila",

  // Russian / Ukrainian, Cyrillic
  "залупа",
  "пизда",
  "пиздець",
  "пиздец",
  "хуй",
  "хуя",
  "хуйня",
  "блядь",
  "блять",
  "бля",
  "ебать",
  "ебал",
  "ёбаный",
  "ебаный",
  "мудак",
  "пидор",
  "пидорас",
  "гандон",
  "гондон",
  "говно",
  "долбоёб",
  "долбоеб",
  "жопа",
  "срака",
  "сука",
  "манда",

  // English
  "cum",
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "cunt",
  "asshole",
  "arsehole",
  "nigger",
  "nigga",
  "whore",
  "slut",
  "twat",
  "wanker",
  "penis",
  "vagina",
  "dildo",
  "retard",
]);
