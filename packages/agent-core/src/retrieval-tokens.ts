/**
 * The tokenizer decision retrieval shares between the index and the query:
 * identifiers split into words, lower case, plurals singular, a small suffix
 * stripper, and question scaffolding dropped. The index and every query run
 * the same function, so a word the index stores is a word a query can meet.
 */

// Function words and question scaffolding carry no domain signal ("what
// governs X?", "what must stay true when X?"). Entries are compared after
// stemming, so "govern" also drops "governs" and "governing".
const STOP_WORDS = [
  "a",
  "about",
  "after",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "before",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "each",
  "for",
  "from",
  "govern",
  "happen",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "must",
  "my",
  "of",
  "on",
  "or",
  "other",
  "our",
  "should",
  "so",
  "stay",
  "tell",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "true",
  "us",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
];

// "ids" is the one three-letter plural common enough in questions to name.
const SHORT_PLURALS = new Set(["ids"]);

/** A plural's singular ("tags" / "tag"); "status" or "analysis" stay. */
export function singular(token: string): string {
  if (SHORT_PLURALS.has(token)) return token.slice(0, -1);
  return token.length > 3 &&
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is") &&
    !token.endsWith("ies")
    ? token.slice(0, -1)
    : token;
}

const STEM_SUFFIXES = ["ation", "ion", "ing", "ory", "ed"] as const;
const Y_SUFFIX = /(?<=[^aeiou])i(?:es|ed)$/;

/** A deliberately small suffix stripper: "detached" / "detach", "applies" / "apply". */
export function stem(token: string): string {
  if (token.length < 6 || /\d/.test(token)) return token;
  if (Y_SUFFIX.test(token)) return token.replace(Y_SUFFIX, "y");
  let stemmed = token;
  for (const suffix of STEM_SUFFIXES) {
    if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 4) {
      stemmed = stemmed.slice(0, -suffix.length);
      break;
    }
  }
  return stemmed.length > 4 && stemmed.endsWith("e")
    ? stemmed.slice(0, -1)
    : stemmed;
}

/** Every word of `value`, normalized, stop words kept, in order. */
export function words(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => stem(singular(token)));
}

const STOP_TOKENS = new Set(STOP_WORDS.flatMap((word) => words(word)));

/** True for a token that carries no domain signal. */
export function isStopToken(token: string): boolean {
  return STOP_TOKENS.has(token);
}

/** The signal tokens of `value`, each once, in first-seen order. */
export function signalTokens(value: string): string[] {
  return [...new Set(words(value).filter((token) => !STOP_TOKENS.has(token)))];
}
