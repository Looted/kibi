import { describe, expect, test } from "bun:test";
import {
  LOGIC_IR_VERSION,
  logicRuleHash,
  logicSemanticKey,
  renderLogicProlog,
  validateLogicIr,
} from "../../src/logic/ir";

const atom = (name: string, args: readonly Record<string, unknown>[] = []) => ({
  kind: "atom",
  name,
  args,
});

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
