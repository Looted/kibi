import { describe, expect, test } from "bun:test";

import {
  LOGIC_IR_VERSION,
  canonicalLogicJson,
  renderLogicProlog,
  utf8Span,
  validateLogicIr,
} from "../../src/logic/ir.js";

const atom = (
  name: string,
  args: readonly Record<string, unknown>[] = [],
  extra: Record<string, unknown> = {},
) => ({
  kind: "atom" as const,
  name,
  args,
  ...extra,
});

describe("validateLogicIr term and expression coverage", () => {
  test("rejects non-objects, unknown keys, and invalid modalities", () => {
    expect(validateLogicIr("nope").valid).toBe(false);
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "atom",
        modality: "maybe",
        extra: true,
      }).errors.join(" "),
    ).toMatch(/not supported|modality is invalid/);
  });

  test("accepts typed terms, comparisons, counts, and conjunctions", () => {
    const result = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "rule",
      modality: "permit",
      variables: [{ name: "X", type: "entity", quantifier: "forall" }],
      head: atom("retain", [{ kind: "var", name: "X", type: "entity" }], {
        namespace: "privacy",
        polarity: "positive",
        closedWorld: false,
      }),
      body: {
        kind: "all",
        items: [
          atom("customer", [{ kind: "var", name: "X", type: "entity" }]),
          {
            kind: "compare",
            operator: "gte",
            left: { kind: "number", value: 7, unit: "years" },
            right: { kind: "const", value: "min", type: "token" },
          },
          {
            kind: "count",
            operator: "eq",
            value: 1,
            atom: atom("flag", [{ kind: "const", value: "active" }]),
          },
          {
            kind: "temporal",
            relation: "before",
            left: { kind: "timestamp", value: "2026-01-01T00:00:00Z" },
            right: {
              kind: "interval",
              start: "2026-01-02T00:00:00Z",
              end: "2026-01-03T00:00:00Z",
            },
          },
        ],
      },
      exceptions: [
        atom("archived", [{ kind: "var", name: "X", type: "entity" }]),
      ],
      scope: { authority: "privacy", name: "retention", tags: ["normative"] },
      validFrom: "2026-01-01T00:00:00Z",
      validTo: "2027-01-01T00:00:00Z",
      ruleSchemaId: "FACT-RULE-SCHEMA-LOGIC-V1",
    });
    expect(result.valid).toBe(true);
    expect(canonicalLogicJson(result.normalized!)).toContain("permit");
  });

  test("accepts duration terms and closed-world negation", () => {
    const result = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "forbid",
      body: {
        kind: "any",
        items: [
          {
            kind: "not",
            item: { ...atom("archived"), args: [], closedWorld: true },
          },
          {
            kind: "compare",
            operator: "lt",
            left: { kind: "duration", value: 5, unit: "m" },
            right: { kind: "duration", value: 10, unit: "m" },
          },
        ],
      },
    });
    expect(result.valid).toBe(true);
  });

  test("reports malformed terms, operators, and range-restriction errors", () => {
    const malformed = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "rule",
      modality: "assert",
      variables: [
        { name: "x", type: "Bad" },
        "not-object",
        { name: "X", type: "entity", quantifier: "sometimes" },
        { name: "X", type: "entity" },
      ],
      head: atom("retain", [{ kind: "mystery" }]),
      body: {
        kind: "all",
        items: [
          atom("customer", [null as never]),
          {
            kind: "compare",
            operator: "nope",
            left: { kind: "const", value: "" },
            right: { kind: "number", value: Number.NaN, unit: "!!" },
          },
          {
            kind: "count",
            operator: "nope",
            value: -1,
            atom: atom("flag", []),
          },
          {
            kind: "temporal",
            relation: "beside",
            left: { kind: "timestamp", value: "not-a-date" },
            right: {
              kind: "interval",
              start: "2026-02-01T00:00:00Z",
              end: "2026-01-01T00:00:00Z",
            },
          },
          {
            kind: "duration-ish",
          },
        ],
      },
      exceptions: "nope",
      scope: { authority: 1, tags: "nope", extra: true },
    });
    expect(malformed.valid).toBe(false);
    expect(malformed.errors.join(" ")).toMatch(/typed term|invalid|unique/);
  });

  test("rejects empty conjunctions, bad polarity, and unknown expression kinds", () => {
    const result = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: {
        kind: "all",
        items: [
          atom("ok", [], { polarity: "sideways", closedWorld: "yes" }),
          { kind: "mystery" },
        ],
      },
    });
    expect(result.valid).toBe(false);
    const empty = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: { kind: "all", items: [] },
    });
    expect(empty.errors.join(" ")).toMatch(/1\.\.32/);
  });
});

describe("utf8Span", () => {
  test("clamps inverted ranges and counts UTF-8 bytes", () => {
    expect(utf8Span("é", 0, 1)).toEqual({ start: 0, end: 2 });
    expect(utf8Span("abc", 4, 1)).toEqual({ start: 3, end: 3 });
  });
});

describe("renderLogicProlog and remaining validators", () => {
  test("renders atom-only and rule bodies", () => {
    const atomOnly = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "atom",
      modality: "assert",
      head: atom("ready"),
    });
    expect(atomOnly.valid).toBe(true);
    expect(renderLogicProlog(atomOnly.normalized!)).toContain("assert(");

    const rule = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "rule",
      modality: "oblige",
      variables: [{ name: "X", type: "entity" }],
      head: atom("keep", [{ kind: "var", name: "X", type: "entity" }], {
        polarity: "negative",
        namespace: "policy",
      }),
      body: {
        kind: "all",
        items: [
          atom("subject", [{ kind: "var", name: "X", type: "entity" }]),
          {
            kind: "compare",
            operator: "neq",
            left: { kind: "var", name: "X", type: "entity" },
            right: { kind: "const", value: "archived" },
          },
          {
            kind: "temporal",
            relation: "overlaps",
            left: {
              kind: "interval",
              start: "2026-01-01T00:00:00Z",
              end: "2026-06-01T00:00:00Z",
            },
            right: {
              kind: "interval",
              start: "2026-03-01T00:00:00Z",
              end: "2026-09-01T00:00:00Z",
            },
          },
        ],
      },
    });
    expect(rule.valid).toBe(true);
    expect(renderLogicProlog(rule.normalized!)).toContain(":-");
  });

  test("rejects incompatible units, invalid namespaces, and version drift", () => {
    expect(
      validateLogicIr({
        version: "not-a-version",
        kind: "constraint",
        modality: "assert",
        body: {
          kind: "compare",
          operator: "eq",
          left: { kind: "number", value: 1, unit: "days" },
          right: { kind: "number", value: 2, unit: "years" },
        },
      }).errors.join(" "),
    ).toMatch(/version|incompatible units/);

    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        body: atom("ok", [], { namespace: "Bad_NS" }),
      }).errors.join(" "),
    ).toMatch(/namespace/);

    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        body: atom("ok", new Array(9).fill({ kind: "const", value: "x" })),
      }).errors.join(" "),
    ).toMatch(/at most 8/);
  });
});
