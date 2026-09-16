import { describe, expect, test } from "bun:test";

import {
  LOGIC_IR_VERSION,
  type LogicAtom,
  type LogicExpression,
  type LogicRuleIR,
} from "../../src/logic/ir.js";
import {
  buildLogicApplyPlan,
  logicRuleFactId,
} from "../../src/operations/modeling/logic-modeling.js";

const atom = (
  name: string,
  args: readonly Record<string, unknown>[] = [],
): LogicAtom =>
  ({
    kind: "atom" as const,
    name,
    args,
  }) as unknown as LogicAtom;

function validRule(overrides: Partial<LogicRuleIR> = {}): LogicRuleIR {
  return {
    version: LOGIC_IR_VERSION,
    kind: "rule",
    modality: "oblige",
    variables: [{ name: "X", type: "entity" }],
    head: atom("retain", [{ kind: "var", name: "X", type: "entity" }]),
    body: atom("customer", [
      { kind: "var", name: "X", type: "entity" },
    ]) as unknown as LogicExpression,
    ...overrides,
  };
}

describe("logic modeling apply plans", () => {
  test("logicRuleFactId is a stable FACT-RULE hash of the semantic key", () => {
    expect(logicRuleFactId("same-key")).toBe(logicRuleFactId("same-key"));
    expect(logicRuleFactId("same-key")).toMatch(/^FACT-RULE-[0-9A-F]{16}$/);
    expect(logicRuleFactId("same-key")).not.toBe(logicRuleFactId("other-key"));
  });

  test("rejects malformed logic IR before writing a plan", () => {
    expect(() =>
      buildLogicApplyPlan({
        text: "Customer data must be retained.",
        logic: {
          version: "not-a-logic-ir",
          kind: "rule",
          modality: "assert",
        } as unknown as LogicRuleIR,
        source: "test://logic",
      }),
    ).toThrow(/Logic IR validation failed/);
  });

  test("emits a rule-schema fact when the IR does not already declare a schema id", () => {
    const result = buildLogicApplyPlan({
      text: "Customer data must be retained for seven years.",
      logic: validRule(),
      source: "test://logic/schema",
      existingLogicClaims: ["CLAIM-EXISTING", "CLAIM-EXISTING"],
    });

    expect(result.applyPlan).toHaveLength(3);
    expect(result.applyPlan[0]).toMatchObject({
      type: "fact",
      id: "FACT-RULE-SCHEMA-LOGIC-V1",
      properties: {
        fact_kind: "rule_schema",
        rule_name: "kibi.logic.v1",
      },
    });
    expect(result.applyPlan[1]).toMatchObject({
      type: "fact",
      properties: {
        fact_kind: "rule",
        rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
        claim_key: result.claimKey,
      },
    });
    expect(result.applyPlan[2]).toMatchObject({
      type: "req",
      properties: {
        logic_claims: expect.arrayContaining([
          "CLAIM-EXISTING",
          result.claimKey,
        ]),
      },
    });
    expect(result.applyPlan[2]?.properties).toMatchObject({
      semantic_inventory: [
        expect.objectContaining({
          role: "normative",
          status: "modeled",
        }),
      ],
    });
    expect(result.renderedProlog.length).toBeGreaterThan(0);
  });

  test("skips the schema fact, honors supplied claim keys, and marks descriptive claims", () => {
    const text = "Preface. The cache stays warm overnight.";
    const result = buildLogicApplyPlan({
      text,
      logic: validRule({ ruleSchemaId: "FACT-RULE-SCHEMA-CUSTOM" }),
      source: "test://logic/custom",
      requirementId: "REQ-LOGIC-CUSTOM",
      claimKey: "CLAIM-SUPPLIED",
      claimText: "The cache stays warm overnight.",
    });

    expect(result.applyPlan.map((step) => step.type)).toEqual(["fact", "req"]);
    expect(result.claimKey).toBe("CLAIM-SUPPLIED");
    expect(result.claimText).toBe("The cache stays warm overnight");
    expect(result.applyPlan[0]).toMatchObject({
      properties: {
        rule_schema_id: "FACT-RULE-SCHEMA-CUSTOM",
        rule_name: "FACT-RULE-SCHEMA-CUSTOM",
      },
    });
    expect(result.applyPlan[1]).toMatchObject({
      id: "REQ-LOGIC-CUSTOM",
      relationships: [
        expect.objectContaining({
          type: "requires_rule",
          from: "REQ-LOGIC-CUSTOM",
        }),
      ],
    });
    expect(result.applyPlan[1]?.properties).toMatchObject({
      semantic_inventory: [
        expect.objectContaining({
          role: "descriptive",
          claim_key: "CLAIM-SUPPLIED",
        }),
      ],
    });
  });

  test("falls back to a zero-based span when the claim text is not in the source", () => {
    const result = buildLogicApplyPlan({
      text: "Unrelated wrapper text.",
      logic: validRule(),
      source: "test://logic/span",
      claimText: "A standalone claim that must remain valid",
    });

    expect(result.applyPlan[1]?.properties).toMatchObject({
      claim_span_start: 0,
    });
    expect(result.applyPlan[2]?.id).toMatch(/^REQ-LOGIC-/);
    expect(result.applyPlan[2]?.properties).toMatchObject({
      title: "A standalone claim that must remain valid",
    });
  });
});
