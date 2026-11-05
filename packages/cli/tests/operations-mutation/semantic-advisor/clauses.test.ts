import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { KbRejection } from "../../../src/cli-errors.js";
import {
  deriveFactClaimKey,
  extractSemanticClauses,
  hasNormativeAssertion,
  modeledClaimRole,
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../../src/operations/semantic-advisor/clauses.js";

const NORMATIVE = [
  "Users must export",
  "Users shall export",
  "Users should export",
  "Export is required",
  "Export requires a token",
  "Export require a token",
  "Admins may only export",
  "Admins may  only export",
  "Admins are allowed to export",
  "Admins is not allowed to export",
  "Admins are  not  permitted  to export",
  "Admins are entitled to export",
  "Admins are  allowed to export",
  "Admins are not  allowed to export",
  "Admins are allowed  to export",
  "Users may at  least 3",
  "Admins has permission to export",
  "Admins have no permission to export",
  "Admins have  no  permission  to export",
  "Export is permitted",
  "Admins may export only",
  "Admins may not export only",
  "Admins may not be exported only",
  "Admins may  not  be  exported  only",
  "Users may have at most 3 sessions",
  "Users may have at least 3 sessions",
  "Users may exactly 3 sessions",
  "Users may no more than 3 sessions",
  "Users may up to 3 sessions",
  "Users may  have  at  most 3",
  "Users may  no  more  than 3",
  "Users may up  to 3",
  "only admins may export",
  "only admins can export",
  "only  admins  can export",
  "Users must not export",
  "Users cannot export",
  "Users can't export",
  "Export is denied",
  "Export is forbidden",
  "Export is prohibited",
  "Tokens is invalid",
  "Tokens are rejected",
  "Tokens be prohibited",
  "Tokens become forbidden",
  "Tokens becomes invalid",
  "Tokens remain invalid",
  "Tokens remains invalid",
  "Tokens are  invalid",
  "reject invalid tokens",
  "rejects unresolved tokens",
  "rejected ambiguous tokens",
  "rejection  invalid tokens",
  "Export fails clearly",
  "Export fail explicitly",
  "Export failed with a code",
  "Export fails  with a code",
  "Tokens expire after a day",
  "Tokens expires within a day",
  "Tokens expire in a day",
  "Tokens expire  in a day",
  "The failure behavior",
  "The failure policy",
  "The failure outcome",
  "The failure  outcome",
  "The error handling",
  "The error behavior",
  "The error policy",
  "The error outcome",
  "The error  outcome",
  "The required outcome",
  "The required  outcome",
  "Locale defaults to en",
  "Locale default to en",
  "Locale default  to en",
  "USERS MUST EXPORT",
];

const DESCRIPTIVE = [
  "Users export reports",
  "Users mustard export",
  "Users amust export",
  "Admins may export",
  "Admins mayonly export",
  "Admins are allowedto export",
  "Users can export",
  "Admins have permissions to export",
  "Users may haveat most 3",
  "Admins may export onlyish",
  "only admins",
  "Tokens are invalidated",
  "reject tokens",
  "Export fails",
  "Tokens expire",
  "The failure",
  "The error",
  "Locale defaults",
  "Exports permittedly",
  "Users xmust export",
];

describe("hasNormativeAssertion", () => {
  test.each(NORMATIVE)("%p is normative", (text) => {
    expect(hasNormativeAssertion(text)).toBe(true);
  });
  test.each(DESCRIPTIVE)("%p is not normative", (text) => {
    expect(hasNormativeAssertion(text)).toBe(false);
  });
});

describe("modeledClaimRole", () => {
  test("a deontic modality decides, else the assertion pattern", () => {
    expect(modeledClaimRole("Users export", "oblige")).toBe("normative");
    expect(modeledClaimRole("Users export", "forbid")).toBe("normative");
    expect(modeledClaimRole("Users export", "permit")).toBe("normative");
    expect(modeledClaimRole("Users export", "assert")).toBe("descriptive");
    expect(modeledClaimRole("Users export", "")).toBe("descriptive");
    expect(modeledClaimRole("Users export")).toBe("descriptive");
    expect(modeledClaimRole("Users must export")).toBe("normative");
    expect(modeledClaimRole("Users must export", "assert")).toBe("normative");
  });
});

describe("normalizeSemanticClause", () => {
  test.each([
    ["- Users export.", "Users export"],
    ["  *  Users export", "Users export"],
    ["+ Users export", "Users export"],
    ["12. Users export", "Users export"],
    ["3) Users  \n export,;:!?", "Users export"],
    ["-Users export", "-Users export"],
    ["1.Users export", "1.Users export"],
    ["x - Users", "x - Users"],
    ["Users export.", "Users export"],
    ["Users, export", "Users, export"],
    ["  Users export  ", "Users export"],
    ["", ""],
  ])("%p -> %p", (value, expected) => {
    expect(normalizeSemanticClause(value)).toBe(expected);
  });
});

describe("semanticClaimKey", () => {
  test("hashes the normalized lowercase clause", () => {
    const digest = createHash("sha256").update("users export").digest("hex");
    expect(semanticClaimKey("- Users  EXPORT.")).toBe(
      `CLAIM-${digest.slice(0, 16).toUpperCase()}`,
    );
  });
});

describe("deriveFactClaimKey", () => {
  test("fills the key of a grounding fact from its text", () => {
    const entity: Record<string, unknown> = {
      type: "fact",
      claim_text: "Users export",
    };
    deriveFactClaimKey(entity);
    expect(entity).toStrictEqual({
      type: "fact",
      claim_text: "Users export",
      claim_key: semanticClaimKey("Users export"),
    });
    const typed: Record<string, unknown> = {
      type: "fact",
      fact_kind: "predicate",
      claim_text: "x",
    };
    deriveFactClaimKey(typed);
    expect(typed.claim_key).toBe(semanticClaimKey("x"));
  });

  test("leaves other entities, keyed facts, textless facts and review notes alone", () => {
    for (const entity of [
      { type: "req", claim_text: "x" },
      { type: "fact", claim_text: "x", claim_key: "CLAIM-SET" },
      { type: "fact", claim_text: 3 },
      { type: "fact" },
      { type: "fact", claim_text: "x", fact_kind: "observation" },
      { type: "fact", claim_text: "x", fact_kind: "meta" },
    ]) {
      const copy = { ...entity };
      deriveFactClaimKey(copy);
      expect(copy).toStrictEqual(entity);
    }
    const nonString: Record<string, unknown> = {
      type: "fact",
      claim_text: "x",
      fact_kind: 1,
    };
    deriveFactClaimKey(nonString);
    expect(nonString.claim_key).toBe(semanticClaimKey("x"));
  });
});

const texts = (text: string, supplied?: readonly string[]) =>
  extractSemanticClauses(text, supplied).map((clause) => clause.text);

describe("extractSemanticClauses", () => {
  test("splits on line breaks, semicolons and sentence ends", () => {
    expect(
      texts("A must x.\r\n\nB must y; C must z. D must w! 2 must v? e must u"),
    ).toStrictEqual([
      "A must x",
      "B must y",
      "C must z",
      "D must w",
      "2 must v? e must u",
    ]);
    expect(texts("A.B must x.  C")).toStrictEqual(["A.B must x", "C"]);
    expect(texts("A must x\nB must y")).toStrictEqual(["A must x", "B must y"]);
  });

  test("splits conjunctions only when every part is normative", () => {
    expect(texts("Users must export and the admin must approve")).toStrictEqual(
      ["Users must export", "the admin must approve"],
    );
    expect(texts("Users must export, and admins shall approve")).toStrictEqual([
      "Users must export",
      "admins shall approve",
    ]);
    expect(texts("Users must export and  admins shall approve")).toStrictEqual([
      "Users must export",
      "admins shall approve",
    ]);
    expect(texts("Analytics and Sentry must load")).toStrictEqual([
      "Analytics and Sentry must load",
    ]);
    expect(texts("Users must export,  and admins must approve")).toStrictEqual([
      "Users must export",
      "admins must approve",
    ]);
    expect(texts("Users must export ,xand admins must approve")).toStrictEqual([
      "Users must export ,xand admins must approve",
    ]);
    const far = `the  ${"x".repeat(140)} must y`;
    expect(texts(`Users must export and ${far}`)).toStrictEqual([
      "Users must export",
      far.replace("  ", " "),
    ]);
    expect(texts("Users export and admins must approve")).toStrictEqual([
      "Users export and admins must approve",
    ]);
    expect(
      texts("Users must export when ready and tokens expire after a day"),
    ).toStrictEqual([
      "Users must export when ready",
      "tokens expire after a day",
    ]);
    expect(
      texts("Users must log in before export and sessions default to short"),
    ).toStrictEqual([
      "Users must log in before export",
      "sessions default to short",
    ]);
  });

  test.each([
    "must",
    "shall",
    "should",
    "require",
    "requires",
    "cannot",
    "can't",
    "expire",
    "default",
    "transition",
    "states are",
    "state are",
    "invalid",
    "unresolved",
    "reject invalid",
    "rejected unresolved",
    "rejection ambiguous",
    "fail clearly",
    "fails explicitly",
    "failed with",
    "failure behavior",
    "failure policy",
    "failure outcome",
    "error handling",
    "error behavior",
    "error policy",
    "error outcome",
    "prohibited",
    "forbidden",
    "required outcome",
    "states  are",
    "reject ambiguous",
    "rejected  ambiguous",
    "fail  clearly",
    "failure  policy",
    "error  policy",
    "required  outcome",
  ])("a conjunction before %p starts a new clause", (cue) => {
    const clauses = texts(`Users must export and tokens ${cue} if stale`);
    expect(clauses).toStrictEqual([
      "Users must export",
      `tokens ${cue.replace("  ", " ")} if stale`,
    ]);
  });

  test("keeps mutually exclusive and package semantics sentences atomic", () => {
    expect(
      texts("A must x and B must y are Mutually  exclusive"),
    ).toStrictEqual([
      "A must x and B must y are Mutually  exclusive".replace(/\s+/g, " "),
    ]);
    for (const phrase of [
      "consumer-scoped Node package semantics",
      "consumer-scoped  Node package semantics",
      "consumer-scoped Node  package semantics",
      "consumer-scoped Node package  semantics",
    ]) {
      expect(
        texts(`Resolution must use ${phrase} and exports must be restricted`),
      ).toStrictEqual([
        `Resolution must use ${phrase.replace("  ", " ")} and exports must be restricted`,
      ]);
    }
  });

  test("marks detected clauses and their normativity", () => {
    expect(
      extractSemanticClauses(
        "Users must export. Reports are nice. Users export when ready",
      ),
    ).toStrictEqual([
      {
        claim_key: semanticClaimKey("Users must export"),
        text: "Users must export",
        index: 0,
        normative: true,
        source: "detected",
      },
      {
        claim_key: semanticClaimKey("Reports are nice"),
        text: "Reports are nice",
        index: 1,
        normative: false,
        source: "detected",
      },
      {
        claim_key: semanticClaimKey("Users export when ready"),
        text: "Users export when ready",
        index: 2,
        normative: true,
        source: "detected",
      },
    ]);
    for (const cue of ["before", "unless", "if", "when"]) {
      expect(
        extractSemanticClauses(`Users export ${cue} x`)[0]?.normative,
      ).toBe(true);
    }
    expect(extractSemanticClauses("Users export whence x")[0]?.normative).toBe(
      false,
    );
    expect(
      extractSemanticClauses("Users export WHEN ready")[0]?.normative,
    ).toBe(true);
  });

  test("drops clauses whose claim key repeats", () => {
    expect(
      extractSemanticClauses("x", [
        "- - Users must export",
        "- Users must export",
      ]).map((c) => c.text),
    ).toStrictEqual(["- Users must export"]);
  });

  test("uses supplied clauses and drops repeated ones", () => {
    expect(
      extractSemanticClauses("ignored", [
        "- Users must export.",
        "",
        "users MUST export",
        "Reports",
      ]),
    ).toStrictEqual([
      {
        claim_key: semanticClaimKey("Users must export"),
        text: "Users must export",
        index: 0,
        normative: true,
        source: "supplied",
      },
      {
        claim_key: semanticClaimKey("Reports"),
        text: "Reports",
        index: 2,
        normative: false,
        source: "supplied",
      },
    ]);
    expect(texts("A must x. A must X. B")).toStrictEqual(["A must x", "B"]);
    expect(texts("")).toStrictEqual([]);
  });

  test("rejects supplied clauses without any claim", () => {
    let error: unknown;
    try {
      extractSemanticClauses("x", ["", " - "]);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(KbRejection);
    expect((error as KbRejection).code).toBe("VALIDATION_FAILED");
    expect((error as KbRejection).message).toBe(
      "Semantic advisor clauses must contain at least one non-empty atomic claim",
    );
    expect((error as KbRejection).issues).toStrictEqual([
      { rule: "min_items", field: "semantic_clauses" },
    ]);
    expect(() => texts("x", [])).toThrow(KbRejection);
  });
});
