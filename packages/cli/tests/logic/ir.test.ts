// implements REQ-kibi-logical-requirement-coverage
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  LOGIC_IR_VERSION,
  LOGIC_RULE_MAX_ATOMS,
  LOGIC_RULE_MAX_DEPTH,
  LOGIC_RULE_MAX_VARIABLES,
  canonicalLogicJson,
  logicRuleHash,
  logicSemanticKey,
  renderLogicProlog,
  termVariables,
  utf8Span,
  validateLogicIr,
} from "../../src/logic/ir.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

let restoreEnv: (() => void) | undefined;

afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
});

const atom = (
  name: string,
  args: readonly Record<string, unknown>[] = [],
  extra: Record<string, unknown> = {},
) => ({ kind: "atom" as const, name, args, ...extra });

function normalizedOrThrow(result: ReturnType<typeof validateLogicIr>) {
  expect(result.normalized).toBeDefined();
  if (!result.normalized) {
    throw new Error("valid logic IR result is missing its normalized value");
  }
  return result.normalized;
}

describe("kibi.logic.v1", () => {
  test("canonicalizes a safe conditional with variables and keeps a separate full rule hash", () => {
    const input = {
      version: LOGIC_IR_VERSION,
      kind: "rule",
      modality: "oblige",
      variables: [{ name: "X", type: "entity" }],
      head: atom("retain", [{ kind: "var", name: "X", type: "entity" }]),
      body: atom("customer", [{ kind: "var", name: "X", type: "entity" }]),
      scope: { authority: "privacy", tags: ["normative"] },
    } as const;
    const result = validateLogicIr(input);
    expect(result.valid).toBe(true);
    expect(result.normalized?.version).toBe(LOGIC_IR_VERSION);
    expect(result.ruleHash).toMatch(/^[a-f0-9]{64}$/);
    if (!result.normalized) throw new Error("expected normalized IR");
    expect(result.semanticKey).toBe(logicSemanticKey(result.normalized));
    expect(result.ruleHash).toBe(logicRuleHash(result.normalized));
    expect(result.renderedProlog).toContain("oblige");
  });

  test("rejects raw Prolog-shaped fields, unbound variables, and existential heads", () => {
    const result = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "rule",
      modality: "assert",
      variables: [{ name: "Y", type: "entity", quantifier: "exists" }],
      head: {
        kind: "atom",
        name: "derived",
        args: [{ kind: "var", name: "Y", type: "entity" }],
      },
      body: {
        kind: "atom",
        name: "source",
        args: [],
        raw_goal: "consult(secret)",
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(
      /raw_goal|range-restricted|existential/,
    );
  });

  test("requires an explicit closed-world marker for negation and validates intervals", () => {
    const unsafe = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: {
        kind: "not",
        item: { ...atom("archived"), args: [] },
      },
    });
    expect(unsafe.valid).toBe(false);
    expect(unsafe.errors.join(" ")).toContain("closedWorld");

    const safe = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: {
        kind: "temporal",
        relation: "overlaps",
        left: {
          kind: "interval",
          start: "2026-01-01T00:00:00Z",
          end: "2026-01-02T00:00:00Z",
        },
        right: {
          kind: "interval",
          start: "2026-01-01T12:00:00Z",
          end: "2026-01-03T00:00:00Z",
        },
      },
    });
    expect(safe.valid).toBe(true);
    if (!safe.normalized) throw new Error("expected normalized IR");
    expect(renderLogicProlog(safe.normalized)).toContain("temporal(overlaps");
  });

  test("converges alpha-renamed variables on one semantic key", () => {
    const make = (name: string) =>
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "rule",
        modality: "assert",
        variables: [{ name, type: "entity" }],
        head: atom("retained", [{ kind: "var", name, type: "entity" }]),
        body: atom("customer", [{ kind: "var", name, type: "entity" }]),
      });
    const first = make("X");
    const second = make("Customer");
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    expect(first.semanticKey).toBe(second.semanticKey);
  });
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
    expect(canonicalLogicJson(normalizedOrThrow(result))).toContain("permit");
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
    expect(renderLogicProlog(normalizedOrThrow(atomOnly))).toContain("assert(");

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
    expect(renderLogicProlog(normalizedOrThrow(rule))).toContain(":-");
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

describe("validateLogicIr remaining term, temporal, and kind branches", () => {
  test("rejects kind mismatches, max limits, inverted validity, and deep expressions", () => {
    restoreEnv = isolateKibiEnv();
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "atom",
        modality: "assert",
        head: atom("ready"),
        body: atom("extra"),
      }).errors.join(" "),
    ).toMatch(/forbids body/);
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "rule",
        modality: "assert",
        head: atom("ready"),
      }).errors.join(" "),
    ).toMatch(/requires head and body/);
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        head: atom("ready"),
        body: atom("ready"),
      }).errors.join(" "),
    ).toMatch(/forbids head/);

    const tooManyVars = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      variables: Array.from(
        { length: LOGIC_RULE_MAX_VARIABLES + 1 },
        (_, i) => ({
          name: `V${i + 1}`,
          type: "entity",
        }),
      ),
      body: atom("ready"),
    });
    expect(tooManyVars.errors.join(" ")).toMatch(/variables exceed/);

    const tooManyExceptions = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: atom("ready"),
      exceptions: Array.from({ length: 17 }, () => atom("skip")),
    });
    expect(tooManyExceptions.errors.join(" ")).toMatch(/at most 16/);

    const inverted = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: atom("ready"),
      validFrom: "2027-01-01T00:00:00Z",
      validTo: "2026-01-01T00:00:00Z",
    });
    expect(inverted.errors.join(" ")).toMatch(/validFrom must not be after/);

    const badDates = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: atom("ready"),
      validFrom: "not-a-date",
      validTo: 12,
      ruleSchemaId: "1bad",
      scope: "nope",
    });
    expect(badDates.errors.join(" ")).toMatch(
      /validFrom|validTo|ruleSchemaId|scope/,
    );

    let deep: Record<string, unknown> = atom("leaf");
    for (let i = 0; i <= LOGIC_RULE_MAX_DEPTH; i += 1) {
      deep = { kind: "all", items: [deep] };
    }
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        body: deep,
      }).errors.join(" "),
    ).toMatch(/maximum expression depth/);
  });

  test("covers remaining temporal relations, unused variables, and unsafe disjunctions", () => {
    restoreEnv = isolateKibiEnv();
    const temporal = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "forbid",
      variables: [
        { name: "Unused", type: "entity" },
        { name: "X", type: "entity" },
      ],
      body: {
        kind: "all",
        items: [
          atom("subject", [{ kind: "var", name: "X", type: "entity" }]),
          {
            kind: "temporal",
            relation: "after",
            left: { kind: "timestamp", value: "2026-02-01T00:00:00Z" },
            right: { kind: "timestamp", value: "2026-01-01T00:00:00Z" },
          },
          {
            kind: "temporal",
            relation: "during",
            left: { kind: "timestamp", value: "2026-01-02T00:00:00Z" },
            right: {
              kind: "interval",
              start: "2026-01-01T00:00:00Z",
              end: "2026-01-03T00:00:00Z",
            },
          },
          {
            kind: "temporal",
            relation: "starts",
            left: {
              kind: "interval",
              start: "2026-01-01T00:00:00Z",
              end: "2026-01-02T00:00:00Z",
            },
            right: {
              kind: "interval",
              start: "2026-01-01T00:00:00Z",
              end: "2026-01-03T00:00:00Z",
            },
          },
          {
            kind: "temporal",
            relation: "finishes",
            left: {
              kind: "interval",
              start: "2026-01-02T00:00:00Z",
              end: "2026-01-03T00:00:00Z",
            },
            right: {
              kind: "interval",
              start: "2026-01-01T00:00:00Z",
              end: "2026-01-03T00:00:00Z",
            },
          },
          {
            kind: "compare",
            operator: "lte",
            left: { kind: "number", value: 1 },
            right: { kind: "number", value: 2 },
          },
          {
            kind: "compare",
            operator: "gt",
            left: { kind: "duration", value: 2, unit: "h" },
            right: { kind: "duration", value: 1, unit: "h" },
          },
        ],
      },
      exceptions: [
        atom("archived", [{ kind: "var", name: "X", type: "entity" }]),
      ],
      scope: {
        authority: " privacy ",
        name: " retention ",
        tags: [" b ", "a"],
      },
    });
    expect(temporal.valid).toBe(true);
    expect(
      temporal.normalized?.variables?.some((v) => v.name.startsWith("V")),
    ).toBe(true);

    const unsafeAny = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "rule",
      modality: "assert",
      variables: [{ name: "X", type: "entity" }],
      head: atom("keep", [{ kind: "var", name: "X", type: "entity" }]),
      body: {
        kind: "any",
        items: [
          atom("pos", [{ kind: "var", name: "X", type: "entity" }]),
          {
            kind: "not",
            item: {
              ...atom("neg", [{ kind: "var", name: "X", type: "entity" }]),
              closedWorld: true,
            },
          },
        ],
      },
    });
    expect(unsafeAny.valid).toBe(false);
    expect(unsafeAny.errors.join(" ")).toMatch(/range-restricted/);

    const badTemporal = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: {
        kind: "temporal",
        relation: "during",
        left: { kind: "const", value: "x" },
        right: { kind: "const", value: "y" },
      },
    });
    expect(badTemporal.errors.join(" ")).toMatch(/during requires/);

    const badFinish = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: {
        kind: "temporal",
        relation: "finishes",
        left: { kind: "timestamp", value: "2026-01-01T00:00:00Z" },
        right: { kind: "timestamp", value: "2026-01-02T00:00:00Z" },
      },
    });
    expect(badFinish.errors.join(" ")).toMatch(/requires interval/);

    const missingDecl = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: atom("ready", [{ kind: "var", name: "Z", type: "entity" }]),
    });
    expect(missingDecl.errors.join(" ")).toMatch(/not declared/);
  });

  test("renders remaining Prolog shapes and clamps utf8 spans", () => {
    restoreEnv = isolateKibiEnv();
    const constraint = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "forbid",
      body: {
        kind: "any",
        items: [
          atom("left"),
          {
            kind: "count",
            operator: "gte",
            value: 2,
            atom: atom("flag", [{ kind: "const", value: "on" }]),
          },
        ],
      },
    });
    expect(constraint.valid).toBe(true);
    expect(renderLogicProlog(normalizedOrThrow(constraint))).toContain(
      "forbid :-",
    );
    expect(renderLogicProlog(normalizedOrThrow(constraint))).toContain(
      "count(",
    );

    const atomOnly = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "atom",
      modality: "deny",
      head: atom("ready", [{ kind: "number", value: 1, unit: "count" }]),
    });
    expect(atomOnly.valid).toBe(true);
    expect(renderLogicProlog(normalizedOrThrow(atomOnly))).toBe(
      "deny(ready(1)).",
    );

    const tooManyAtoms = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      body: {
        kind: "all",
        items: Array.from({ length: LOGIC_RULE_MAX_ATOMS + 1 }, (_, i) =>
          atom(`p${i}`),
        ),
      },
    });
    expect(tooManyAtoms.errors.join(" ")).toMatch(/more than/);

    expect(utf8Span("abc", -2, 1)).toEqual({ start: 0, end: 1 });
  });

  test("rejects untyped expressions, non-atom wrappers, before terms, and unsafe exceptions", () => {
    restoreEnv = isolateKibiEnv();
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        body: "not-an-expression",
      }).errors.join(" "),
    ).toMatch(/typed expression object/);

    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        body: { kind: "not", item: { kind: "const", value: "x" } },
      }).errors.join(" "),
    ).toMatch(/must be an atom/);

    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "assert",
        body: {
          kind: "temporal",
          relation: "before",
          left: { kind: "const", value: "x" },
          right: { kind: "const", value: "y" },
        },
      }).errors.join(" "),
    ).toMatch(/before requires timestamp or interval terms/);

    const unsafeException = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "constraint",
      modality: "assert",
      variables: [
        { name: "X", type: "entity" },
        { name: "Y", type: "entity" },
      ],
      body: atom("ready", [{ kind: "var", name: "X", type: "entity" }]),
      exceptions: [atom("skip", [{ kind: "var", name: "Y", type: "entity" }])],
    });
    expect(unsafeException.errors.join(" ")).toMatch(
      /exception variable Y is not range-restricted/,
    );
    expect([...termVariables({ kind: "var", name: "X" } as never)]).toEqual([
      "X",
    ]);
    expect(termVariables({ kind: "const", value: "a" } as never).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Validation contracts: every rejected shape and the exact errors it reports.
// ---------------------------------------------------------------------------
const D1 = "2026-01-01T00:00:00.000Z";
const D2 = "2026-01-02T00:00:00.000Z";
const X = { name: "X", type: "entity" };
const Y = { name: "Y", type: "entity" };
const vX = { kind: "var", name: "X", type: "entity" };
const vY = { kind: "var", name: "Y", type: "entity" };
const T1 = { kind: "timestamp", value: D1 };
const T2 = { kind: "timestamp", value: D2 };
const I12 = { kind: "interval", start: D1, end: D2 };
const base = { version: LOGIC_IR_VERSION, modality: "assert" };
/** A valid rule, retain(X) :- customer(X), with the given fields replaced. */
const rule = (overrides: Record<string, unknown>) => ({
  ...base,
  kind: "rule",
  variables: [X],
  head: atom("retain", [vX]),
  body: atom("customer", [vX]),
  ...overrides,
});
const constraint = (body: unknown, variables?: unknown[]) => ({
  ...base,
  kind: "constraint",
  body,
  ...(variables ? { variables } : {}),
});
const compare = (
  left: unknown,
  right: unknown = { kind: "number", value: 1 },
) => ({
  kind: "compare",
  operator: "eq",
  left,
  right,
});
const temporal = (relation: string, left: unknown, right: unknown) => ({
  kind: "temporal",
  relation,
  left,
  right,
});
const closed = (name: string, args: Record<string, unknown>[] = []) =>
  atom(name, args, { closedWorld: true });
const nest = (depth: number): unknown =>
  depth === 0 ? atom("q") : { kind: "all", items: [nest(depth - 1)] };

const REJECTED: Array<[string, unknown, string[]]> = [
  ["the input is not an object", [], ["logic IR must be an object"]],
  [
    "an unknown top-level key",
    rule({ extra: 1 }),
    ["logic.extra is not supported by kibi.logic.v1"],
  ],
  [
    "a wrong version",
    rule({ version: "kibi.logic.v0" }),
    ["version must be kibi.logic.v1"],
  ],
  [
    "an unknown kind",
    rule({ kind: "fact" }),
    ["kind must be atom, rule, or constraint"],
  ],
  ["an unknown modality", rule({ modality: "must" }), ["modality is invalid"]],
  [
    "too many variables",
    rule({
      variables: Array.from({ length: 33 }, (_, index) => ({
        name: `V${index}`,
        type: "entity",
      })),
      head: atom("p"),
      body: atom("q"),
    }),
    ["variables exceed maximum 32"],
  ],
  [
    "a variable that is not an object",
    rule({ variables: [X, "Y"] }),
    ["variables[1] must be an object"],
  ],
  [
    "a variable with an unknown key",
    rule({ variables: [{ ...X, note: "x" }] }),
    ["variables[0].note is not supported by kibi.logic.v1"],
  ],
  [
    "a duplicate variable",
    rule({ variables: [X, X] }),
    ["variables[1].name must be unique and uppercase"],
  ],
  [
    "a variable name that is not uppercase",
    rule({ variables: [X, { name: "y", type: "entity" }] }),
    ["variables[1].name must be unique and uppercase"],
  ],
  [
    "a variable name with a lowercase start",
    rule({ variables: [X, { name: "yY", type: "entity" }] }),
    ["variables[1].name must be unique and uppercase"],
  ],
  [
    "a variable name with a trailing symbol",
    rule({ variables: [X, { name: "Y-1", type: "entity" }] }),
    ["variables[1].name must be unique and uppercase"],
  ],
  [
    "a variable name that is not a string",
    rule({ variables: [X, { name: 5, type: "entity" }] }),
    ["variables[1].name must be unique and uppercase"],
  ],
  [
    "a missing variable type",
    rule({ variables: [{ name: "X" }] }),
    ["variables[0].type is invalid"],
  ],
  [
    "a variable type with an uppercase start",
    rule({ variables: [{ name: "X", type: "Entity" }] }),
    ["variables[0].type is invalid"],
  ],
  [
    "a variable type with a space",
    rule({ variables: [{ name: "X", type: "big entity" }] }),
    ["variables[0].type is invalid"],
  ],
  [
    "an unknown quantifier",
    rule({ variables: [{ ...X, quantifier: "some" }] }),
    ["variables[0].quantifier is invalid"],
  ],
  [
    "an existential head variable",
    rule({ variables: [{ ...X, quantifier: "exists" }] }),
    ["head variable X cannot be existential"],
  ],
  [
    "a head that is not an atom",
    rule({ head: { kind: "var", name: "X", type: "entity" } }),
    ["head must be an atom"],
  ],
  ["a head that is not a record", rule({ head: 5 }), ["head must be an atom"]],
  [
    "an atom with an unknown key",
    rule({ head: { ...atom("p", [vX]), raw: "x" } }),
    ["head.raw is not supported by kibi.logic.v1"],
  ],
  [
    "an atom name that is not a string",
    rule({ head: { kind: "atom", name: 5, args: [vX] } }),
    ["head.name must be a lowercase predicate identifier"],
  ],
  [
    "an atom name with an uppercase start",
    rule({ head: atom("Retain", [vX]) }),
    ["head.name must be a lowercase predicate identifier"],
  ],
  [
    "an atom name with a space",
    rule({ head: atom("re tain", [vX]) }),
    ["head.name must be a lowercase predicate identifier"],
  ],
  [
    "an atom name that is blank",
    rule({ head: atom("  ", [vX]) }),
    ["head.name must be a lowercase predicate identifier"],
  ],
  [
    "an atom namespace that is not a string",
    rule({ head: atom("p", [vX], { namespace: 5 }) }),
    ["head.namespace is invalid"],
  ],
  [
    "an atom namespace with an uppercase start",
    rule({ head: atom("p", [vX], { namespace: "Ns" }) }),
    ["head.namespace is invalid"],
  ],
  [
    "an atom namespace with a space",
    rule({ head: atom("p", [vX], { namespace: "n s" }) }),
    ["head.namespace is invalid"],
  ],
  [
    "atom args that are not an array",
    rule({ head: { kind: "atom", name: "p", args: "X" } }),
    ["head.args must contain at most 8 terms"],
  ],
  [
    "nine atom args",
    rule({
      head: atom(
        "p",
        Array.from({ length: 9 }, () => vX),
      ),
    }),
    ["head.args must contain at most 8 terms"],
  ],
  [
    "an unknown polarity",
    rule({ head: atom("p", [vX], { polarity: "maybe" }) }),
    ["head.polarity must be positive or negative"],
  ],
  [
    "a non-boolean closedWorld",
    rule({ head: atom("p", [vX], { closedWorld: "yes" }) }),
    ["head.closedWorld must be boolean"],
  ],
  [
    "a negative body atom binds nothing",
    rule({ body: atom("q", [vX], { polarity: "negative" }) }),
    [
      "head variable X is not range-restricted by a positive body atom",
      "body variable X is not range-restricted by a positive atom",
    ],
  ],
  [
    "a term that is not a record",
    constraint(compare(null)),
    ["body.left must be a typed term object"],
  ],
  [
    "a term kind that is not a string",
    constraint(compare({ kind: 5 })),
    ["body.left must be a typed term object"],
  ],
  [
    "an unknown term kind",
    constraint(compare({ kind: "list" })),
    ["body.left.kind list is not supported"],
  ],
  [
    "a var term with an unknown key",
    constraint(compare({ ...vX, extra: 1 }), [X]),
    [
      "body.left.extra is not supported by kibi.logic.v1",
      "body variable X is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term name that is not uppercase",
    constraint(compare({ kind: "var", name: "x", type: "entity" }), [X]),
    [
      "body.left.name must be an uppercase variable name",
      "body.left.name x is not declared in variables",
      "variable x is not declared",
      "body variable x is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term name with a lowercase start",
    constraint(compare({ kind: "var", name: "xX", type: "entity" }), [X]),
    [
      "body.left.name must be an uppercase variable name",
      "body.left.name xX is not declared in variables",
      "variable xX is not declared",
      "body variable xX is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term name with a trailing symbol",
    constraint(compare({ kind: "var", name: "X-1", type: "entity" }), [X]),
    [
      "body.left.name must be an uppercase variable name",
      "body.left.name X-1 is not declared in variables",
      "variable X-1 is not declared",
      "body variable X-1 is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term name that is not a string",
    constraint(compare({ kind: "var", name: 5, type: "entity" }), [X]),
    ["body.left.name must be an uppercase variable name"],
  ],
  [
    "an undeclared var term",
    constraint(compare({ kind: "var", name: "Y", type: "entity" }), [X]),
    [
      "body.left.name Y is not declared in variables",
      "variable Y is not declared",
      "body variable Y is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term without a type",
    constraint(compare({ kind: "var", name: "X" }), [X]),
    [
      "body.left.type must be a lowercase type name",
      "body variable X is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term type with an uppercase start",
    constraint(compare({ kind: "var", name: "X", type: "Entity" }), [X]),
    [
      "body.left.type must be a lowercase type name",
      "body variable X is not range-restricted by a positive atom",
    ],
  ],
  [
    "a var term type with a space",
    constraint(compare({ kind: "var", name: "X", type: "big entity" }), [X]),
    [
      "body.left.type must be a lowercase type name",
      "body variable X is not range-restricted by a positive atom",
    ],
  ],
  [
    "a const term with an unknown key",
    constraint(compare({ kind: "const", value: "a", unit: "x" })),
    ["body.left.unit is not supported by kibi.logic.v1"],
  ],
  [
    "a blank const value",
    constraint(compare({ kind: "const", value: "  " })),
    ["body.left.value must be a non-empty string"],
  ],
  [
    "a const value that is not a string",
    constraint(compare({ kind: "const", value: 5 })),
    ["body.left.value must be a non-empty string"],
  ],
  [
    "a const type that is not a string",
    constraint(compare({ kind: "const", value: "a", type: 5 })),
    ["body.left.type is invalid"],
  ],
  [
    "a const type with an uppercase start",
    constraint(compare({ kind: "const", value: "a", type: "Color" })),
    ["body.left.type is invalid"],
  ],
  [
    "a const type with a space",
    constraint(compare({ kind: "const", value: "a", type: "a color" })),
    ["body.left.type is invalid"],
  ],
  [
    "a number term with an unknown key",
    constraint(compare({ kind: "number", value: 1, type: "x" })),
    ["body.left.type is not supported by kibi.logic.v1"],
  ],
  [
    "a number value that is a string",
    constraint(compare({ kind: "number", value: "1" })),
    ["body.left.value must be finite"],
  ],
  [
    "an infinite number value",
    constraint(compare({ kind: "number", value: Number.POSITIVE_INFINITY })),
    ["body.left.value must be finite"],
  ],
  [
    "a number unit that is not a string",
    constraint(compare({ kind: "number", value: 1, unit: 5 })),
    ["body.left.unit is invalid"],
  ],
  [
    "a number unit with an uppercase start",
    constraint(compare({ kind: "number", value: 1, unit: "Kg" })),
    ["body.left.unit is invalid"],
  ],
  [
    "a number unit with a space",
    constraint(compare({ kind: "number", value: 1, unit: "k g" })),
    ["body.left.unit is invalid"],
  ],
  [
    "a duration term with an unknown key",
    constraint(
      compare(
        { kind: "duration", value: 1, unit: "d", type: "x" },
        { kind: "duration", value: 1, unit: "d" },
      ),
    ),
    ["body.left.type is not supported by kibi.logic.v1"],
  ],
  [
    "a negative duration",
    constraint(
      compare(
        { kind: "duration", value: -1, unit: "d" },
        { kind: "duration", value: 1, unit: "d" },
      ),
    ),
    ["body.left.value must be a non-negative finite duration"],
  ],
  [
    "a duration value that is a string",
    constraint(
      compare(
        { kind: "duration", value: "1", unit: "d" },
        { kind: "duration", value: 1, unit: "d" },
      ),
    ),
    ["body.left.value must be a non-negative finite duration"],
  ],
  [
    "an infinite duration",
    constraint(
      compare(
        { kind: "duration", value: Number.POSITIVE_INFINITY, unit: "d" },
        { kind: "duration", value: 1, unit: "d" },
      ),
    ),
    ["body.left.value must be a non-negative finite duration"],
  ],
  [
    "an unknown duration unit",
    constraint(
      compare(
        { kind: "duration", value: 1, unit: "y" },
        { kind: "duration", value: 1, unit: "y" },
      ),
    ),
    ["body.left.unit is invalid", "body.right.unit is invalid"],
  ],
  [
    "a missing duration unit",
    constraint(
      compare({ kind: "duration", value: 1 }, { kind: "duration", value: 1 }),
    ),
    ["body.left.unit is invalid", "body.right.unit is invalid"],
  ],
  [
    "a timestamp term with an unknown key",
    constraint(temporal("before", { ...T1, unit: "x" }, T2)),
    ["body.left.unit is not supported by kibi.logic.v1"],
  ],
  [
    "a timestamp value that is not a string",
    constraint(temporal("before", { kind: "timestamp", value: 5 }, T2)),
    ["body.left.value must be an ISO timestamp"],
  ],
  [
    "a timestamp value that does not parse",
    constraint(temporal("before", { kind: "timestamp", value: "soon" }, T2)),
    ["body.left.value must be an ISO timestamp"],
  ],
  [
    "an interval term with an unknown key",
    constraint(temporal("during", T1, { ...I12, value: "x" })),
    ["body.right.value is not supported by kibi.logic.v1"],
  ],
  [
    "an interval start that is not a string",
    constraint(temporal("during", T1, { ...I12, start: 5 })),
    ["body.right.start must be an ISO timestamp"],
  ],
  [
    "an interval start that does not parse",
    constraint(temporal("during", T1, { ...I12, start: "soon" })),
    ["body.right.start must be an ISO timestamp"],
  ],
  [
    "an interval end that is not a string",
    constraint(temporal("during", T1, { ...I12, end: 5 })),
    ["body.right.end must be an ISO timestamp"],
  ],
  [
    "an interval end that does not parse",
    constraint(temporal("during", T1, { ...I12, end: "later" })),
    ["body.right.end must be an ISO timestamp"],
  ],
  [
    "an interval that ends before it starts",
    constraint(
      temporal("during", T1, { kind: "interval", start: D2, end: D1 }),
    ),
    ["body.right.start must not be after body.right.end"],
  ],
  [
    "an interval with unparsable bounds",
    constraint(
      temporal("during", T1, { kind: "interval", start: "x", end: "y" }),
    ),
    [
      "body.right.start must be an ISO timestamp",
      "body.right.end must be an ISO timestamp",
    ],
  ],
  [
    "an expression nested too deep",
    constraint(nest(17)),
    [
      "body.items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0].items[0] exceeds maximum expression depth 16",
    ],
  ],
  [
    "an expression that is not a record",
    constraint(5),
    ["body must be a typed expression object"],
  ],
  [
    "an expression kind that is not a string",
    constraint({ kind: 5 }),
    ["body must be a typed expression object"],
  ],
  [
    "an unknown expression kind",
    constraint({ kind: "xor", items: [] }),
    ["body.kind xor is not supported"],
  ],
  [
    "a conjunction with an unknown key",
    constraint({ kind: "all", items: [atom("q")], note: 1 }),
    ["body.note is not supported by kibi.logic.v1"],
  ],
  [
    "a conjunction whose items are not an array",
    constraint({ kind: "all", items: atom("q") }),
    ["body.items must contain 1..32 expressions"],
  ],
  [
    "an empty disjunction",
    constraint({ kind: "any", items: [] }),
    ["body.items must contain 1..32 expressions"],
  ],
  [
    "a conjunction of 33 items",
    constraint({
      kind: "all",
      items: Array.from({ length: 33 }, () => atom("q")),
    }),
    ["body.items must contain 1..32 expressions"],
  ],
  [
    "a disjunction that binds the head variable in one branch only",
    rule({ body: { kind: "any", items: [atom("q", [vX]), atom("r")] } }),
    [
      "head variable X is not range-restricted by a positive body atom",
      "body variable X is not range-restricted by a positive atom",
    ],
  ],
  [
    "a disjunction with a branch that uses an unbound variable",
    rule({
      body: {
        kind: "any",
        items: [
          atom("q", [vX]),
          { kind: "all", items: [atom("r", [vX]), compare(vY)] },
        ],
      },
      variables: [X, Y],
    }),
    [
      "head variable X is not range-restricted by a positive body atom",
      "body variable X is not range-restricted by a positive atom",
      "body variable Y is not range-restricted by a positive atom",
    ],
  ],
  [
    "a negation with an unknown key",
    constraint({ kind: "not", item: closed("q"), note: 1 }),
    ["body.note is not supported by kibi.logic.v1"],
  ],
  [
    "a negation without closedWorld",
    constraint({ kind: "not", item: atom("q") }),
    ["body.item must explicitly set closedWorld=true for negation-as-failure"],
  ],
  [
    "a negation with closedWorld false",
    constraint({ kind: "not", item: atom("q", [], { closedWorld: false }) }),
    ["body.item must explicitly set closedWorld=true for negation-as-failure"],
  ],
  [
    "a negation of a non-record",
    constraint({ kind: "not", item: 5 }),
    ["body.item must be an atom"],
  ],
  [
    "a negated variable is not bound",
    rule({
      body: {
        kind: "all",
        items: [atom("q", [vX]), { kind: "not", item: closed("r", [vY]) }],
      },
      variables: [X, Y],
    }),
    ["body variable Y is not range-restricted by a positive atom"],
  ],
  [
    "a comparison with an unknown key",
    constraint({ ...compare({ kind: "number", value: 1 }), note: 1 }),
    ["body.note is not supported by kibi.logic.v1"],
  ],
  [
    "a comparison with an unknown operator",
    constraint({ ...compare({ kind: "number", value: 1 }), operator: "like" }),
    ["body.operator is invalid"],
  ],
  [
    "a comparison of different units",
    constraint(
      compare(
        { kind: "number", value: 1, unit: "kg" },
        { kind: "duration", value: 1, unit: "d" },
      ),
    ),
    ["body compares incompatible units kg and d"],
  ],
  [
    "a comparison of a variable binds nothing",
    rule({
      body: { kind: "all", items: [atom("q", [vX]), compare(vY)] },
      variables: [X, Y],
    }),
    ["body variable Y is not range-restricted by a positive atom"],
  ],
  [
    "a comparison of two variables binds neither",
    constraint(compare(vX, vY), [X, Y]),
    [
      "body variable X is not range-restricted by a positive atom",
      "body variable Y is not range-restricted by a positive atom",
    ],
  ],
  [
    "a count with an unknown key",
    constraint({
      kind: "count",
      atom: atom("q"),
      operator: "gt",
      value: 1,
      note: 1,
    }),
    ["body.note is not supported by kibi.logic.v1"],
  ],
  [
    "a count of a non-atom",
    constraint({
      kind: "count",
      atom: { kind: "all", items: [] },
      operator: "gt",
      value: 1,
    }),
    ["body.atom must be an atom"],
  ],
  [
    "a count with an unknown operator",
    constraint({ kind: "count", atom: atom("q"), operator: "most", value: 1 }),
    ["body.operator is invalid"],
  ],
  [
    "a negative count",
    constraint({ kind: "count", atom: atom("q"), operator: "gt", value: -1 }),
    ["body.value must be a non-negative integer"],
  ],
  [
    "a fractional count",
    constraint({ kind: "count", atom: atom("q"), operator: "gt", value: 1.5 }),
    ["body.value must be a non-negative integer"],
  ],
  [
    "a count value that is a string",
    constraint({ kind: "count", atom: atom("q"), operator: "gt", value: "1" }),
    ["body.value must be a non-negative integer"],
  ],
  [
    "a temporal relation with an unknown key",
    constraint({ ...temporal("before", T1, T2), note: 1 }),
    ["body.note is not supported by kibi.logic.v1"],
  ],
  [
    "an unknown temporal relation",
    constraint(temporal("meets", I12, I12)),
    ["body.relation is invalid", "body meets requires interval terms"],
  ],
  [
    "before with a number term",
    constraint(temporal("before", { kind: "number", value: 1 }, T2)),
    ["body before requires timestamp or interval terms"],
  ],
  [
    "after with a number term on the right",
    constraint(temporal("after", T1, { kind: "number", value: 1 })),
    ["body after requires timestamp or interval terms"],
  ],
  [
    "during inside a timestamp",
    constraint(temporal("during", T1, T2)),
    ["body during requires a timestamp or interval inside an interval"],
  ],
  [
    "during of a number",
    constraint(temporal("during", { kind: "number", value: 1 }, I12)),
    ["body during requires a timestamp or interval inside an interval"],
  ],
  [
    "overlaps with a timestamp",
    constraint(temporal("overlaps", T1, I12)),
    ["body overlaps requires interval terms"],
  ],
  [
    "starts with a timestamp on the right",
    constraint(temporal("starts", I12, T2)),
    ["body starts requires interval terms"],
  ],
  [
    "finishes with a non-record",
    constraint(temporal("finishes", I12, null)),
    [
      "body.right must be a typed term object",
      "body finishes requires interval terms",
    ],
  ],
  [
    "temporal variables bind nothing",
    rule({
      body: {
        kind: "all",
        items: [atom("q", [vX]), temporal("before", vY, vX)],
      },
      variables: [X, Y],
    }),
    [
      "body.items[1] before requires timestamp or interval terms",
      "body variable Y is not range-restricted by a positive atom",
    ],
  ],
  [
    "atom kind with a body",
    { ...base, kind: "atom", head: atom("p"), body: atom("q") },
    ["atom kind requires head and forbids body"],
  ],
  [
    "atom kind without a head",
    { ...base, kind: "atom" },
    ["atom kind requires head and forbids body"],
  ],
  [
    "rule kind without a body",
    { ...base, kind: "rule", head: atom("p") },
    ["rule kind requires head and body"],
  ],
  [
    "rule kind without a head",
    { ...base, kind: "rule", body: atom("q") },
    ["rule kind requires head and body"],
  ],
  [
    "constraint kind with a head",
    { ...base, kind: "constraint", head: atom("p"), body: atom("q") },
    ["constraint kind requires body and forbids head"],
  ],
  [
    "constraint kind without a body",
    { ...base, kind: "constraint" },
    ["constraint kind requires body and forbids head"],
  ],
  [
    "more than 64 atoms",
    rule({
      head: atom("p"),
      body: {
        kind: "all",
        items: [
          { kind: "all", items: Array.from({ length: 32 }, () => atom("q")) },
          { kind: "all", items: Array.from({ length: 32 }, () => atom("q")) },
        ],
      },
    }),
    ["rule contains more than 64 atoms"],
  ],
  [
    "an undeclared head variable",
    rule({ variables: [] }),
    [
      "head.args[0].name X is not declared in variables",
      "body.args[0].name X is not declared in variables",
      "variable X is not declared",
    ],
  ],
  [
    "exceptions that are not an array",
    rule({ exceptions: atom("q") }),
    ["exceptions must contain at most 16 expressions"],
  ],
  [
    "seventeen exceptions",
    rule({ exceptions: Array.from({ length: 17 }, () => atom("q")) }),
    ["exceptions must contain at most 16 expressions"],
  ],
  [
    "an exception variable that the body does not bind",
    rule({ variables: [X, Y], exceptions: [atom("q", [vY])] }),
    ["exception variable Y is not range-restricted by a positive body atom"],
  ],
  [
    "a scope that is not an object",
    rule({ scope: "privacy" }),
    ["scope must be an object"],
  ],
  [
    "a scope with an unknown key",
    rule({ scope: { owner: "x" } }),
    ["scope.owner is not supported by kibi.logic.v1"],
  ],
  [
    "a scope authority that is not a string",
    rule({ scope: { authority: 5 } }),
    ["scope.authority must be a string"],
  ],
  [
    "a scope name that is not a string",
    rule({ scope: { name: 5 } }),
    ["scope.name must be a string"],
  ],
  [
    "scope tags that are not an array",
    rule({ scope: { tags: "a" } }),
    ["scope.tags must be an array of strings"],
  ],
  [
    "a scope tag that is not a string",
    rule({ scope: { tags: ["a", 5] } }),
    ["scope.tags must be an array of strings"],
  ],
  [
    "a ruleSchemaId that is not a string",
    rule({ ruleSchemaId: 5 }),
    ["ruleSchemaId is invalid"],
  ],
  [
    "a ruleSchemaId with a leading digit",
    rule({ ruleSchemaId: "1schema" }),
    ["ruleSchemaId is invalid"],
  ],
  [
    "a ruleSchemaId with a space",
    rule({ ruleSchemaId: "schema id" }),
    ["ruleSchemaId is invalid"],
  ],
  [
    "a validFrom that is not a string",
    rule({ validFrom: 5 }),
    ["validFrom must be an ISO timestamp"],
  ],
  [
    "a validFrom that does not parse",
    rule({ validFrom: "soon" }),
    ["validFrom must be an ISO timestamp"],
  ],
  [
    "a validTo that is not a string",
    rule({ validTo: 5 }),
    ["validTo must be an ISO timestamp"],
  ],
  [
    "a validTo that does not parse",
    rule({ validTo: "later" }),
    ["validTo must be an ISO timestamp"],
  ],
  [
    "a validity window that ends before it starts",
    rule({ validFrom: D2, validTo: D1 }),
    ["validFrom must not be after validTo"],
  ],
  [
    "a const type given as an array",
    constraint(compare({ kind: "const", value: "a", type: ["color"] })),
    ["body.left.type is invalid"],
  ],
  [
    "a number unit given as an array",
    constraint(compare({ kind: "number", value: 1, unit: ["kg"] })),
    ["body.left.unit is invalid"],
  ],
  [
    "an atom namespace given as an array",
    rule({ head: atom("retain", [vX], { namespace: ["ns"] }) }),
    ["head.namespace is invalid"],
  ],
  [
    "a ruleSchemaId given as an array",
    rule({ ruleSchemaId: ["schema"] }),
    ["ruleSchemaId is invalid"],
  ],
  [
    "a numeric interval start before an early end",
    constraint(
      temporal("during", T1, {
        kind: "interval",
        start: 5,
        end: "1990-01-01T00:00:00Z",
      }),
    ),
    ["body.right.start must be an ISO timestamp"],
  ],
  [
    "a numeric validFrom",
    rule({ validFrom: 5, validTo: "1990-01-01T00:00:00Z" }),
    [
      "validFrom must be an ISO timestamp",
      "validFrom must not be after validTo",
    ],
  ],
  [
    "a disjunction whose last branch alone binds the head variable",
    rule({
      variables: [X, Y],
      head: atom("retain", [vY]),
      body: { kind: "any", items: [atom("q", [vX]), atom("r", [vX, vY])] },
    }),
    [
      "head variable Y is not range-restricted by a positive body atom",
      "body variable Y is not range-restricted by a positive atom",
    ],
  ],
  [
    "named non-variable terms",
    rule({
      head: atom("retain", [vX, { kind: "const", value: "a", name: "Q" }]),
      body: {
        kind: "all",
        items: [
          atom("customer", [vX]),
          compare(
            { kind: "const", value: "a", name: "R" },
            { kind: "const", value: "b", name: "S" },
          ),
          temporal("before", { ...T1, name: "T" }, { ...T2, name: "U" }),
        ],
      },
    }),
    [
      "head.args[1].name is not supported by kibi.logic.v1",
      "body.items[1].left.name is not supported by kibi.logic.v1",
      "body.items[1].right.name is not supported by kibi.logic.v1",
      "body.items[2].left.name is not supported by kibi.logic.v1",
      "body.items[2].right.name is not supported by kibi.logic.v1",
    ],
  ],
  [
    "a right-hand var term name that is not a string",
    constraint(
      compare(
        { kind: "number", value: 1 },
        { kind: "var", name: 5, type: "entity" },
      ),
      [X],
    ),
    ["body.right.name must be an uppercase variable name"],
  ],
  [
    "a unit on a const term",
    constraint(
      compare(
        { kind: "const", value: "a", unit: "kg" },
        { kind: "number", value: 1, unit: "g" },
      ),
    ),
    ["body.left.unit is not supported by kibi.logic.v1"],
  ],
  [
    "a non-string unit beside a string unit",
    constraint(
      compare(
        { kind: "number", value: 1, unit: 5 },
        { kind: "number", value: 1, unit: "kg" },
      ),
    ),
    ["body.left.unit is invalid"],
  ],
  [
    "an exception that is not an expression",
    rule({ exceptions: [5] }),
    ["exceptions[0] must be a typed expression object"],
  ],
];

describe("validateLogicIr rejection contracts", () => {
  test("the base rule is valid", () => {
    expect(validateLogicIr(rule({}))).toMatchObject({
      valid: true,
      errors: [],
    });
  });

  for (const [label, input, errors] of REJECTED)
    test(`rejects ${label}`, () => {
      expect(validateLogicIr(input)).toEqual({
        valid: false,
        errors,
        warnings: [],
      });
    });
});

const ACCEPTED: Array<[string, unknown]> = [
  [
    "padded variable names, types and atom names",
    rule({
      variables: [{ name: " X ", type: " entity " }],
      head: atom(" retain ", [{ kind: "var", name: "X", type: " entity " }]),
    }),
  ],
  [
    "eight atom args",
    rule({
      head: atom(
        "p",
        Array.from({ length: 8 }, () => vX),
      ),
    }),
  ],
  [
    "a namespaced positive atom",
    rule({
      head: atom("p", [vX], {
        namespace: "kb/core",
        polarity: "positive",
        closedWorld: false,
      }),
    }),
  ],
  [
    "thirty-two variables",
    rule({
      variables: [
        X,
        ...Array.from({ length: 31 }, (_, index) => ({
          name: `V${index}`,
          type: "entity",
        })),
      ],
    }),
  ],
  [
    "forall and exists quantifiers",
    rule({
      variables: [
        { ...X, quantifier: "forall" },
        { ...Y, quantifier: "exists" },
      ],
      body: atom("customer", [vX, vY]),
    }),
  ],
  ["an expression nested sixteen deep", constraint(nest(16))],
  [
    "a conjunction of 32 items",
    constraint({
      kind: "all",
      items: Array.from({ length: 32 }, () => atom("q")),
    }),
  ],
  [
    "sixty-four atoms",
    rule({
      head: atom("p"),
      body: {
        kind: "all",
        items: [
          { kind: "all", items: Array.from({ length: 32 }, () => atom("q")) },
          { kind: "all", items: Array.from({ length: 31 }, () => atom("q")) },
        ],
      },
    }),
  ],
  [
    "a disjunction that binds the head variable in every branch",
    rule({ body: { kind: "any", items: [atom("q", [vX]), atom("r", [vX])] } }),
  ],
  [
    "a closed-world negation of a bound variable",
    rule({
      body: {
        kind: "all",
        items: [atom("q", [vX]), { kind: "not", item: closed("r", [vX]) }],
      },
    }),
  ],
  [
    "a typed const and matching units",
    constraint(
      compare(
        { kind: "const", value: " red ", type: "color" },
        { kind: "number", value: 1, unit: "kg" },
      ),
    ),
  ],
  [
    "one side without a unit",
    constraint(
      compare(
        { kind: "number", value: 1, unit: "kg" },
        { kind: "number", value: 2 },
      ),
    ),
  ],
  [
    "a zero duration in every unit",
    constraint({
      kind: "all",
      items: ["ms", "s", "m", "h", "d", "w"].map((unit) =>
        compare(
          { kind: "duration", value: 0, unit },
          { kind: "duration", value: 1, unit },
        ),
      ),
    }),
  ],
  [
    "every comparison operator",
    constraint({
      kind: "all",
      items: ["eq", "neq", "lt", "lte", "gt", "gte"].map((operator) => ({
        ...compare({ kind: "number", value: 1 }),
        operator,
      })),
    }),
  ],
  [
    "a zero count with every operator",
    constraint({
      kind: "all",
      items: ["eq", "neq", "lt", "lte", "gt", "gte"].map((operator) => ({
        kind: "count",
        atom: atom("q"),
        operator,
        value: 0,
      })),
    }),
  ],
  [
    "every temporal relation on matching terms",
    constraint({
      kind: "all",
      items: [
        temporal("before", T1, I12),
        temporal("after", I12, T2),
        temporal("during", T1, I12),
        temporal("during", I12, I12),
        temporal("overlaps", I12, I12),
        temporal("starts", I12, I12),
        temporal("finishes", I12, { kind: "interval", start: D2, end: D2 }),
      ],
    }),
  ],
  [
    "every modality",
    ["assert", "deny", "oblige", "permit", "forbid"].map((modality) =>
      rule({ modality }),
    ),
  ],
  ["an atom kind", { ...base, kind: "atom", head: atom("p") }],
  [
    "sixteen exceptions on bound variables",
    rule({ exceptions: Array.from({ length: 16 }, () => atom("q", [vX])) }),
  ],
  [
    "a full scope, schema id and one-instant validity",
    rule({
      scope: { authority: "privacy", name: "retention", tags: ["a"] },
      ruleSchemaId: "Schema:v1/rule-1",
      validFrom: D1,
      validTo: D1,
    }),
  ],
  [
    "an existential variable declared before the head variable",
    rule({
      variables: [{ ...Y, quantifier: "exists" }, X],
      body: atom("customer", [vX, vY]),
    }),
  ],
];

describe("validateLogicIr acceptance contracts", () => {
  for (const [label, input] of ACCEPTED)
    test(`accepts ${label}`, () => {
      for (const ir of Array.isArray(input) ? input : [input])
        expect(validateLogicIr(ir)).toMatchObject({ valid: true, errors: [] });
    });
});

// ---------------------------------------------------------------------------
// Normalization, identity and rendering contracts.
// ---------------------------------------------------------------------------
const vZed = { kind: "var", name: "Zed", type: " order " };
const vAlpha = { kind: "var", name: "Alpha", type: "customer" };
const RICH = {
  version: LOGIC_IR_VERSION,
  kind: "rule",
  modality: "oblige",
  variables: [
    { name: "Zed", type: " order " },
    { name: "Unused", type: "entity", quantifier: "exists" },
    { name: " Alpha ", type: "customer", quantifier: "forall" },
  ],
  head: atom(" retain ", [vZed, vAlpha], { namespace: "privacy" }),
  body: {
    kind: "all",
    items: [
      atom("placed", [vZed, vAlpha]),
      atom("customer", [
        vAlpha,
        { kind: "const", value: " eu ", type: "region" },
      ]),
      { kind: "any", items: [atom("flagged", [vZed]), atom("held", [vZed])] },
      { kind: "not", item: atom("erased", [vAlpha], { closedWorld: true }) },
      {
        kind: "compare",
        operator: "lte",
        left: { kind: "number", value: 2.5, unit: "kg" },
        right: { kind: "number", value: 3 },
      },
      {
        kind: "count",
        atom: atom("order", [vAlpha], { polarity: "negative" }),
        operator: "gte",
        value: 2,
      },
      {
        kind: "temporal",
        relation: "during",
        left: { kind: "timestamp", value: "2026-01-01T01:00:00+01:00" },
        right: {
          kind: "interval",
          start: "2025-12-31T00:00:00Z",
          end: "2026-01-02T00:00:00+00:00",
        },
      },
    ],
  },
  exceptions: [atom("exempt", [vAlpha]), atom("audited", [vZed])],
  scope: { authority: " privacy ", name: " retention ", tags: [" b ", "a"] },
  ruleSchemaId: "schema:retention",
  validFrom: "2026-01-01T01:00:00+01:00",
  validTo: "2026-12-31T00:00:00Z",
};

describe("validateLogicIr normalization contracts", () => {
  test("a rich rule normalizes, hashes and renders to fixed output", () => {
    const result = validateLogicIr(RICH);
    const canonicalJson = JSON.stringify({
      body: {
        items: [
          {
            items: [
              {
                args: [
                  {
                    kind: "var",
                    name: "V1",
                    type: "order",
                  },
                ],
                kind: "atom",
                name: "flagged",
              },
              {
                args: [
                  {
                    kind: "var",
                    name: "V1",
                    type: "order",
                  },
                ],
                kind: "atom",
                name: "held",
              },
            ],
            kind: "any",
          },
          {
            args: [
              {
                kind: "var",
                name: "V2",
                type: "customer",
              },
              {
                kind: "const",
                type: "region",
                value: "eu",
              },
            ],
            kind: "atom",
            name: "customer",
          },
          {
            args: [
              {
                kind: "var",
                name: "V1",
                type: "order",
              },
              {
                kind: "var",
                name: "V2",
                type: "customer",
              },
            ],
            kind: "atom",
            name: "placed",
          },
          {
            kind: "compare",
            left: {
              kind: "number",
              unit: "kg",
              value: 2.5,
            },
            operator: "lte",
            right: {
              kind: "number",
              value: 3,
            },
          },
          {
            atom: {
              args: [
                {
                  kind: "var",
                  name: "V2",
                  type: "customer",
                },
              ],
              kind: "atom",
              name: "order",
              polarity: "negative",
            },
            kind: "count",
            operator: "gte",
            value: 2,
          },
          {
            item: {
              args: [
                {
                  kind: "var",
                  name: "V2",
                  type: "customer",
                },
              ],
              closedWorld: true,
              kind: "atom",
              name: "erased",
            },
            kind: "not",
          },
          {
            kind: "temporal",
            left: {
              kind: "timestamp",
              value: "2026-01-01T00:00:00.000Z",
            },
            relation: "during",
            right: {
              end: "2026-01-02T00:00:00.000Z",
              kind: "interval",
              start: "2025-12-31T00:00:00.000Z",
            },
          },
        ],
        kind: "all",
      },
      exceptions: [
        {
          args: [
            {
              kind: "var",
              name: "V1",
              type: "order",
            },
          ],
          kind: "atom",
          name: "audited",
        },
        {
          args: [
            {
              kind: "var",
              name: "V2",
              type: "customer",
            },
          ],
          kind: "atom",
          name: "exempt",
        },
      ],
      head: {
        args: [
          {
            kind: "var",
            name: "V1",
            type: "order",
          },
          {
            kind: "var",
            name: "V2",
            type: "customer",
          },
        ],
        kind: "atom",
        name: "retain",
        namespace: "privacy",
      },
      kind: "rule",
      modality: "oblige",
      ruleSchemaId: "schema:retention",
      scope: {
        authority: "privacy",
        name: "retention",
        tags: ["a", "b"],
      },
      validFrom: "2026-01-01T00:00:00.000Z",
      validTo: "2026-12-31T00:00:00.000Z",
      variables: [
        {
          name: "V1",
          quantifier: "forall",
          type: "order",
        },
        {
          name: "V2",
          quantifier: "forall",
          type: "customer",
        },
        {
          name: "V3",
          quantifier: "exists",
          type: "entity",
        },
      ],
      version: "kibi.logic.v1",
    });
    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: [
        "negation is accepted only for explicitly closed-world predicates and requires stratification against stored schemas",
      ],
      normalized: JSON.parse(canonicalJson),
      canonicalJson,
      ruleHash:
        "29a4646a5d801fedd55860f072fdfe9acab57240ff812ed4a84d3cdc031874d5",
      semanticKey: "SEM-29A4646A5D801FEDD55860F0",
      renderedProlog:
        "oblige('privacy:retain'(V1,V2)) :- (flagged(V1) ; held(V1)), customer(V2,eu), placed(V1,V2), 2.5 lte 3, count(negative(order(V2)), gte, 2), not(erased(V2)), temporal(during, '2026-01-01T00:00:00.000Z', interval('2025-12-31T00:00:00.000Z','2026-01-02T00:00:00.000Z')).",
    });
    expect(result.ruleHash).toBe(
      createHash("sha256").update(canonicalJson).digest("hex"),
    );
  });

  test("a minimal atom keeps only its required fields", () => {
    expect(
      validateLogicIr({
        version: LOGIC_IR_VERSION,
        kind: "atom",
        modality: "assert",
        head: atom("p"),
        variables: [],
        exceptions: [],
      }),
    ).toMatchObject({
      canonicalJson:
        '{"head":{"args":[],"kind":"atom","name":"p"},"kind":"atom","modality":"assert","version":"kibi.logic.v1"}',
      renderedProlog: "assert(p()).",
      warnings: [],
    });
  });

  test("an empty scope is kept and negation only in exceptions does not warn", () => {
    expect(
      validateLogicIr(
        rule({
          scope: {},
          exceptions: [{ kind: "not", item: closed("erased", [vX]) }],
        }),
      ),
    ).toMatchObject({
      canonicalJson:
        '{"body":{"args":[{"kind":"var","name":"V1","type":"entity"}],"kind":"atom","name":"customer"},"exceptions":[{"item":{"args":[{"kind":"var","name":"V1","type":"entity"}],"closedWorld":true,"kind":"atom","name":"erased"},"kind":"not"}],"head":{"args":[{"kind":"var","name":"V1","type":"entity"}],"kind":"atom","name":"retain"},"kind":"rule","modality":"assert","scope":{},"variables":[{"name":"V1","quantifier":"forall","type":"entity"}],"version":"kibi.logic.v1"}',
      warnings: [],
    });
  });

  test("renames variables by first use, then unused declarations by name", () => {
    const result = validateLogicIr(
      rule({
        variables: [
          { name: "B", type: "b" },
          { name: "A", type: "a" },
          { name: "Z", type: "z" },
          { name: "Y", type: "y" },
        ],
        head: atom("p", [{ kind: "var", name: "Z", type: "entity" }]),
        body: atom("q", [
          { kind: "var", name: "Z", type: "entity" },
          { kind: "var", name: "Y", type: "entity" },
        ]),
        exceptions: [atom("e", [{ kind: "var", name: "Y", type: "entity" }])],
      }),
    );
    expect(result.renderedProlog).toBe("assert(p(V1)) :- q(V1,V2).");
    expect(
      result.normalized?.variables?.map((variable) => [
        variable.name,
        variable.type,
      ]),
    ).toEqual([
      ["V1", "z"],
      ["V2", "y"],
      ["V3", "a"],
      ["V4", "b"],
    ]);
    expect<unknown>(result.normalized?.exceptions).toEqual([
      atom("e", [{ kind: "var", name: "V2", type: "entity" }]),
    ]);
  });

  test("names variables in the order the sorted body first uses them", () => {
    const typed = (name: string) => ({
      kind: "var",
      name,
      type: name.toLowerCase(),
    });
    const result = validateLogicIr({
      ...base,
      kind: "rule",
      variables: ["A", "B", "W", "X", "Y", "Z"].map((name) => ({
        name,
        type: name.toLowerCase(),
      })),
      head: atom("p"),
      body: {
        kind: "all",
        items: [
          {
            kind: "count",
            atom: atom("c", [typed("Y"), typed("X"), typed("W"), typed("B")]),
            operator: "gt",
            value: 0,
          },
          compare(typed("Y")),
          compare(typed("W")),
          compare({ kind: "number", value: 1 }, typed("X")),
          {
            kind: "any",
            items: [atom("a", [typed("Z")]), atom("b", [typed("Z")])],
          },
        ],
      },
    });
    expect(result.renderedProlog).toBe(
      "assert(p()) :- (a(V1) ; b(V1)), 1 eq V2, V3 eq 1, V4 eq 1, count(c(V4,V2,V3,V5), gt, 0).",
    );
    expect(
      result.normalized?.variables?.map((variable) => [
        variable.name,
        variable.type,
      ]),
    ).toEqual([
      ["V1", "z"],
      ["V2", "x"],
      ["V3", "w"],
      ["V4", "y"],
      ["V5", "b"],
      ["V6", "a"],
    ]);
    expect(
      validateLogicIr(
        rule({
          variables: [X, Y],
          head: atom("retain", [vY]),
          body: atom("customer", [vX, vY]),
        }),
      ).renderedProlog,
    ).toBe("assert(retain(V1)) :- customer(V2,V1).");
  });

  test("renders every expression and term shape", () => {
    expect(
      renderLogicProlog({
        version: LOGIC_IR_VERSION,
        kind: "constraint",
        modality: "forbid",
        body: {
          kind: "all",
          items: [
            {
              kind: "any",
              items: [atom("a"), atom("b", [], { polarity: "negative" })],
            },
            {
              kind: "compare",
              operator: "neq",
              left: { kind: "duration", value: 3, unit: "d" },
              right: { kind: "const", value: "Big Co" },
            },
            {
              kind: "temporal",
              relation: "before",
              left: { kind: "timestamp", value: D1 },
              right: { kind: "interval", start: D1, end: D2 },
            },
          ],
        },
      } as never),
    ).toBe(
      "forbid :- (a() ; negative(b())), duration(3,d) neq 'Big Co', temporal(before, '2026-01-01T00:00:00.000Z', interval('2026-01-01T00:00:00.000Z','2026-01-02T00:00:00.000Z')).",
    );
  });

  test("canonical JSON sorts keys at every depth and drops undefined fields", () => {
    expect(
      canonicalLogicJson({
        version: LOGIC_IR_VERSION,
        modality: "assert",
        kind: "constraint",
        scope: { tags: ["b", "a"], name: undefined, authority: "x" },
        body: { kind: "all", items: [{ name: "q", kind: "atom", args: [] }] },
      } as never),
    ).toBe(
      '{"body":{"items":[{"args":[],"kind":"atom","name":"q"}],"kind":"all"},"kind":"constraint","modality":"assert","scope":{"authority":"x","tags":["b","a"]},"version":"kibi.logic.v1"}',
    );
  });

  test("the semantic key is the uppercased first 24 hex digits of the rule hash", () => {
    const normalized = normalizedOrThrow(validateLogicIr(rule({})));
    expect(logicSemanticKey(normalized)).toBe(
      `SEM-${logicRuleHash(normalized).slice(0, 24).toUpperCase()}`,
    );
    expect(logicSemanticKey(normalized)).toMatch(/^SEM-[0-9A-F]{24}$/);
  });

  test("termVariables names only a variable term", () => {
    expect([...termVariables({ kind: "var", name: "X", type: "t" })]).toEqual([
      "X",
    ]);
    expect([...termVariables({ kind: "number", value: 1 })]).toEqual([]);
  });
});
