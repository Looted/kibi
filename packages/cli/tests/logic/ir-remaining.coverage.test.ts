// implements REQ-kibi-logical-requirement-coverage
import { afterEach, describe, expect, test } from "bun:test";
import {
  LOGIC_IR_VERSION,
  LOGIC_RULE_MAX_ATOMS,
  LOGIC_RULE_MAX_DEPTH,
  LOGIC_RULE_MAX_VARIABLES,
  renderLogicProlog,
  utf8Span,
  validateLogicIr,
} from "../../src/logic/ir.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.ts";

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
      variables: Array.from({ length: LOGIC_RULE_MAX_VARIABLES + 1 }, (_, i) => ({
        name: `V${i + 1}`,
        type: "entity",
      })),
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
    expect(badDates.errors.join(" ")).toMatch(/validFrom|validTo|ruleSchemaId|scope/);

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
      scope: { authority: " privacy ", name: " retention ", tags: [" b ", "a"] },
    });
    expect(temporal.valid).toBe(true);
    expect(temporal.normalized?.variables?.some((v) => v.name.startsWith("V"))).toBe(
      true,
    );

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
    expect(renderLogicProlog(constraint.normalized!)).toContain("forbid :-");
    expect(renderLogicProlog(constraint.normalized!)).toContain("count(");

    const atomOnly = validateLogicIr({
      version: LOGIC_IR_VERSION,
      kind: "atom",
      modality: "deny",
      head: atom("ready", [{ kind: "number", value: 1, unit: "count" }]),
    });
    expect(atomOnly.valid).toBe(true);
    expect(renderLogicProlog(atomOnly.normalized!)).toBe("deny(ready(1)).");

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
      exceptions: [
        atom("skip", [{ kind: "var", name: "Y", type: "entity" }]),
      ],
    });
    expect(unsafeException.errors.join(" ")).toMatch(
      /exception variable Y is not range-restricted/,
    );
  });
});
