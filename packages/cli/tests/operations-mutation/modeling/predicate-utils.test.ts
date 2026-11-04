import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  captures,
  clampInteger,
  clampScore,
  escapeRegExp,
  hashId,
  inferDuration,
  inferDurationUnit,
  inferEvent,
  inferGate,
  inferNumber,
  inferOperator,
  inferResource,
  inferScope,
  inferSubject,
  inferTrigger,
  inferUnit,
  matchesKeyword,
  normalizeOptionalString,
  normalizePredicateToken,
  normalizeSubjectKey,
  normalizeText,
  singularize,
  slug,
} from "../../../src/operations/modeling/predicate-utils.js";

describe("text normalization", () => {
  test("normalizeText trims and rejects empty text", () => {
    expect(normalizeText(" a ")).toBe("a");
    for (const value of [" ", undefined as unknown as string]) {
      expect(() => normalizeText(value)).toThrow(
        /^Predicate suggestion failed: text must be a non-empty string$/,
      );
    }
  });

  test("normalizeOptionalString trims or drops", () => {
    expect(normalizeOptionalString(" a ")).toBe("a");
    expect(normalizeOptionalString(" ")).toBeUndefined();
    expect(normalizeOptionalString(undefined)).toBeUndefined();
  });
});

describe("clamps", () => {
  test("clampInteger truncates and bounds", () => {
    expect(clampInteger(undefined, 5, 1, 10)).toBe(5);
    expect(clampInteger(Number.NaN, 5, 1, 10)).toBe(5);
    expect(clampInteger(Number.POSITIVE_INFINITY, 5, 1, 10)).toBe(5);
    expect(clampInteger("7" as never, 5, 1, 10)).toBe(5);
    expect(clampInteger(7.9, 5, 1, 10)).toBe(7);
    expect(clampInteger(-3, 5, 1, 10)).toBe(1);
    expect(clampInteger(30, 5, 1, 10)).toBe(10);
  });

  test("clampScore bounds to [0, 1] with a default", () => {
    expect(clampScore(undefined)).toBe(0.35);
    expect(clampScore(Number.NaN)).toBe(0.35);
    expect(clampScore("0.9" as never)).toBe(0.35);
    expect(clampScore(0.5)).toBe(0.5);
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(2)).toBe(1);
  });
});

describe("identifiers", () => {
  test("slug lowercases and collapses separators", () => {
    expect(slug("  Hello, World!! 42 ")).toBe("hello_world_42");
    expect(slug("__a__")).toBe("a");
    expect(slug("--a b--")).toBe("a_b");
  });

  test("hashId hashes the joined parts", () => {
    const digest = createHash("sha256")
      .update("a\u0000b")
      .digest("hex")
      .slice(0, 12)
      .toUpperCase();
    expect(hashId("P", ["a", "b"])).toBe(`P-${digest}`);
    expect(hashId("P", ["a", "b"])).not.toBe(hashId("P", ["ab"]));
  });

  test("normalizeSubjectKey singularizes each slug part", () => {
    expect(normalizeSubjectKey("Users' Changes Policies")).toBe(
      "user.changes.policy",
    );
    expect(normalizeSubjectKey("The Results")).toBe("the.results");
    expect(singularize("users")).toBe("user");
    expect(singularize("status")).toBe("status");
    expect(singularize("changes")).toBe("changes");
    expect(singularize("results")).toBe("results");
  });

  test("normalizePredicateToken drops articles and punctuation", () => {
    expect(normalizePredicateToken(" the user's   draft ")).toBe("users_draft");
    expect(normalizePredicateToken("An Apple a day")).toBe("Apple_day");
    expect(normalizePredicateToken("the’s x.y-z")).toBe("s_x_y-z");
    expect(normalizePredicateToken("theme")).toBe("theme");
    expect(normalizePredicateToken("__a b__")).toBe("a_b");
    expect(normalizePredicateToken("a.b")).toBe("b");
    expect(normalizePredicateToken("x  ..  y")).toBe("x___y");
  });
});

describe("inferSubject", () => {
  test("prefers a hint, then a grounded subject, then a placeholder", () => {
    expect(inferSubject("editor", " hint ", { subjectKey: "s" })).toBe("hint");
    expect(inferSubject("editor", " ", { subjectKey: " s.k " })).toBe("s.k");
    expect(
      inferSubject("editor", undefined, { requirementId: " REQ-1 " }),
    ).toBe("requirement.subject");
    expect(
      inferSubject("editor", undefined, {
        requirementId: " ",
        subjectKey: " ",
      }),
    ).toBe("editor");
  });

  test("falls back to keywords in free text", () => {
    const cases: Array<[string, string]> = [
      ["The Annotation editor", "editor.annotation"],
      ["The EDITOR", "editor"],
      ["A session", "session"],
      ["Customer Data rules", "customer.data"],
      ["A user", "user"],
      ["Nothing", "requirement.subject"],
    ];
    for (const [text, subject] of cases)
      expect(inferSubject(text, undefined)).toBe(subject);
  });
});

describe("keyword inference", () => {
  test("inferTrigger", () => {
    const cases: Array<[string, string]> = [
      ["On NAVIGATE away", "navigation"],
      ["Press Escape", "escape"],
      ["Cancel it", "cancel"],
      ["Submit it", "submit"],
      ["On click", "click"],
      ["Clicks", "click"],
      ["doubleclick", "unspecified_trigger"],
      ["When it times out", "timeout"],
      ["When it time-out", "timeout"],
      ["When it timed out", "timeout"],
      ["When it timeout", "timeout"],
      ["When it timesout", "timeout"],
      ["When overtime out", "unspecified_trigger"],
      ["When it times outward", "unspecified_trigger"],
      ["When it times  out", "unspecified_trigger"],
      ["Nothing", "unspecified_trigger"],
    ];
    for (const [text, trigger] of cases)
      expect(inferTrigger(text)).toBe(trigger);
  });

  test("inferScope", () => {
    const cases: Array<[string, string]> = [
      ["A Draft", "draft"],
      ["An annotation", "active_annotation"],
      ["A Session", "session"],
      ["The change", "changes"],
      ["The Changes", "changes"],
      ["Exchanges", "subject"],
      ["Changed", "subject"],
      ["Nothing", "subject"],
    ];
    for (const [text, scope] of cases) expect(inferScope(text)).toBe(scope);
  });

  test("inferDuration and its unit", () => {
    expect(inferDuration("Keep for 30 days or 40")).toBe("30");
    expect(inferDuration("abc123 def")).toBe("1");
    expect(inferDuration("none")).toBe("1");
    expect(inferDurationUnit("Two YEARS")).toBe("years");
    expect(inferDurationUnit("a month")).toBe("months");
    expect(inferDurationUnit("a day")).toBe("days");
    expect(inferDurationUnit("an hour")).toBe("unit");
  });

  test("inferResource", () => {
    expect(inferResource("Latency")).toBe("latency");
    expect(inferResource("the TIMEOUT")).toBe("timeout");
    expect(inferResource("file size")).toBe("size");
    expect(inferResource("cpu")).toBe("resource");
  });

  test("inferOperator", () => {
    const cases: Array<[string, string]> = [
      ["A MINIMUM of 3, not 2", "gte"],
      ["at least 3, not 2", "gte"],
      ["must not exceed 3", "lte"],
      ["must not be more than 3", "lte"],
      ["no more than 3, not 4", "lte"],
      ["at most 3, not 4", "lte"],
      ["maximum 3, not 4", "lte"],
      ["must not be 3", "neq"],
      ["is 3", "lte"],
    ];
    for (const [text, operator] of cases)
      expect(inferOperator(text)).toBe(operator);
  });

  test("inferNumber and inferUnit", () => {
    expect(inferNumber("within 2.5 or 3")).toBe("2.5");
    expect(inferNumber("within 25 ms")).toBe("25");
    expect(inferNumber("within 2.55 ms")).toBe("2.55");
    expect(inferNumber("x2.5")).toBe("5");
    expect(inferNumber("x2")).toBe("0");
    expect(inferNumber("2.")).toBe("2");
    expect(inferNumber("none")).toBe("0");
    expect(inferUnit("250 MS")).toBe("ms");
    expect(inferUnit("5 seconds")).toBe("seconds");
    expect(inferUnit("10 MB")).toBe("mb");
    expect(inferUnit("5 second")).toBe("unit");
  });

  test("inferGate reads a quoted gate name", () => {
    expect(inferGate("behind `beta.v2:x-y_z` flag")).toBe("beta.v2:x-y_z");
    expect(inferGate("behind 'b' and \"c\"")).toBe("b");
    expect(inferGate('behind "c"')).toBe("c");
    expect(inferGate("behind 'a b'")).toBe("feature_gate");
    expect(inferGate("behind ''")).toBe("feature_gate");
    expect(inferGate("no gate")).toBe("feature_gate");
  });

  test("inferEvent reads an Event type name", () => {
    expect(inferEvent("emits OrderPlaced2Event then X")).toBe(
      "OrderPlaced2Event",
    );
    expect(inferEvent("emits orderEvent")).toBe("domain_event");
    expect(inferEvent("emits AEvent")).toBe("domain_event");
    expect(inferEvent("emits ABEvent")).toBe("ABEvent");
    expect(inferEvent("emits Event")).toBe("domain_event");
    expect(inferEvent("emits OrderEvents")).toBe("domain_event");
    expect(inferEvent("emits xOrderEvent")).toBe("domain_event");
  });
});

describe("keyword matching", () => {
  test("escapeRegExp escapes every metacharacter", () => {
    const special = ".*+?^${}()|[]\\";
    expect(escapeRegExp(special)).toBe(
      "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\",
    );
    expect(new RegExp(`^${escapeRegExp(special)}$`).test(special)).toBe(true);
    expect(escapeRegExp("abc")).toBe("abc");
  });

  test("matchesKeyword matches whole words with flexible spacing", () => {
    expect(
      matchesKeyword("Must Auto  Save", "must auto  save", "auto save"),
    ).toBe(true);
    expect(matchesKeyword("autosaved", "autosaved", "autosave")).toBe(false);
    // Each whitespace run in a keyword matches any run, a single space too.
    expect(matchesKeyword("auto save", "auto save", "auto  save")).toBe(true);
    expect(matchesKeyword("x-ray", "x-ray", "X-Ray")).toBe(true);
    expect(matchesKeyword("v2 api", "v2 api", "V2")).toBe(true);
    expect(matchesKeyword("prefix_v2", "prefix_v2", "v2")).toBe(false);
  });

  test("matchesKeyword falls back to substring search for other keywords", () => {
    expect(matchesKeyword("ANY", "uses c++ daily", "C++")).toBe(true);
    expect(matchesKeyword("ANY", "uses c daily", "C++")).toBe(false);
    expect(matchesKeyword("ANY", "a.b", "A.B")).toBe(true);
  });
});

describe("captures", () => {
  test("returns the named groups of the first match", () => {
    expect(captures("a=1 b=2", /(?<key>[a-z])=(?<value>\d)/)).toStrictEqual({
      key: "a",
      value: "1",
    });
  });

  test("leaves a group that took no part in the match undefined", () => {
    expect(captures("a", /(?<key>a)(?<rest>b)?/)).toStrictEqual({
      key: "a",
      rest: undefined,
    });
  });

  test("returns no groups when the text does not match", () => {
    expect(captures("xyz", /(?<key>a)/)).toStrictEqual({});
  });
});
