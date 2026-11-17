import { KbRejection } from "../../cli-errors.js";
import type { UpsertInput } from "./types.js";

/**
 * kb_record: the first write of a rule in the agent's words, translated into
 * one kb_upsert payload. The translation is the whole of kb_record's own
 * logic; the payload is validated, written and judged by the same kb_upsert
 * and kb_check paths a hand-written payload goes through.
 */

/** Who stated the rule. */
export const SAID_BY = ["user", "maintainer", "agent"] as const;
export type SaidBy = (typeof SAID_BY)[number];

/** One declaration that implements the rule. */
export type RecordCode = Readonly<{ file: string; symbol: string }>;

export type RecordInput = Readonly<{
  statement: string;
  why: string;
  saidBy: SaidBy;
  quote?: string;
  code: readonly RecordCode[];
  test?: string;
  dryRun?: boolean;
}>;

/** kb_record's own input fields; any other is modeling for kb_upsert. */
export const RECORD_FIELDS = [
  "statement",
  "why",
  "saidBy",
  "quote",
  "code",
  "test",
  "dryRun",
] as const;

const CODE_FIELDS = ["file", "symbol"] as const;

/** The longest title a recorded requirement gets from its statement. */
export const MAX_TITLE = 100;

/** How many words of the statement name a recorded requirement. */
export const ID_WORDS = 6;
/** The most characters of statement words a derived id keeps. */
export const ID_CHARS = 80;

/** Words that say nothing about what the rule is about. */
const FILLER = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "its",
  "must",
  "of",
  "on",
  "or",
  "shall",
  "should",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

function refuseFields(fields: readonly string[], where: string): never {
  throw new KbRejection(
    "VALIDATION_FAILED",
    `kb_record does not take ${fields.join(", ")}${where}: it records a rule from its statement, why, saidBy, quote, code and test. Facts, relationships, proof contracts and other modeling go through kb_upsert.`,
    fields.map((field) => ({ rule: "record_field_unsupported", field })),
  );
}

function foreign(
  value: Readonly<Record<string, unknown>>,
  own: readonly string[],
): string[] {
  return Object.keys(value).filter((key) => !own.includes(key));
}

/**
 * Refuses every field kb_record does not take, at the top level and in each
 * code entry, naming kb_upsert as the call that records it.
 */
export function assertRecordFields(input: Readonly<Record<string, unknown>>) {
  const top = foreign(input, RECORD_FIELDS);
  if (top.length > 0) refuseFields(top, "");
  const code = Array.isArray(input.code) ? input.code : [];
  code.forEach((entry, index) => {
    const extra = foreign(Object(entry), CODE_FIELDS);
    if (extra.length > 0) refuseFields(extra, ` in code[${index}]`);
  });
}

/** The statement's first sentence, cut at a word to MAX_TITLE characters. */
export function recordTitle(statement: string): string {
  // split always yields a first part.
  const first = statement.trim().split(/(?<=[.!?])\s/)[0] as string;
  const sentence = first.replace(/[.!?]$/, "");
  if (sentence.length <= MAX_TITLE) return sentence;
  const cut = sentence.slice(0, MAX_TITLE - 1);
  const space = cut.lastIndexOf(" ");
  return `${space === -1 ? cut : cut.slice(0, space)}…`;
}

/** REQ- and the first ID_WORDS words of the statement that are not filler. */
export function recordIdBase(statement: string): string {
  const words = (statement.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => !FILLER.has(word),
  );
  // Capped so the id, with a -N suffix, stays a valid file name.
  const joined = words
    .slice(0, ID_WORDS)
    .join("-")
    .slice(0, ID_CHARS)
    .replace(/-+$/, "");
  return `REQ-${joined || "rule"}`;
}

/**
 * The first id from the statement no entity has: the base, then the base
 * with -2, -3 and so on. kb_record always records a new requirement.
 */
export async function freeRecordId(
  statement: string,
  exists: (id: string) => Promise<boolean>,
): Promise<string> {
  const base = recordIdBase(statement);
  let id = base;
  for (let suffix = 2; await exists(id); suffix += 1) id = `${base}-${suffix}`;
  return id;
}

/**
 * The one kb_upsert payload a kb_record input stands for: a new open
 * requirement whose body is the statement and whose reason is why; firm
 * with a human origin when a user or maintainer stated it, default with an
 * agent origin when the agent chose it; the quote as origin.ref; the code
 * as implementedBy; and a test as the verified_by link and each symbol's
 * covered_by link. It never sets origin.approved_by.
 */
export function recordUpsertPayload(
  input: RecordInput,
  id: string,
): UpsertInput {
  const human = input.saidBy !== "agent";
  const test = input.test;
  return {
    type: "req",
    id,
    properties: {
      title: recordTitle(input.statement),
      status: "open",
      firmness: human ? "firm" : "default",
      origin: {
        kind: human ? "human" : "agent",
        ...(input.quote !== undefined ? { ref: input.quote } : {}),
      },
    },
    document: { body: `${input.statement.trim()}\n` },
    why: input.why,
    implementedBy: input.code.map((entry) => ({
      sourceFile: entry.file,
      symbol: entry.symbol,
      ...(test !== undefined ? { coveredBy: [test] } : {}),
    })),
    ...(test !== undefined
      ? { relationships: [{ type: "verified_by", from: id, to: test }] }
      : {}),
  };
}
