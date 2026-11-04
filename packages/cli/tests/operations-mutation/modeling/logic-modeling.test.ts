import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  LOGIC_IR_VERSION,
  type LogicRuleIR,
  logicSemanticKey,
  validateLogicIr,
} from "../../../src/logic/ir.js";
import {
  buildLogicApplyPlan,
  logicRuleFactId,
} from "../../../src/operations/modeling/logic-modeling.js";
import { semanticSourceHash } from "../../../src/operations/semantic-advisor/shared.js";

const rule: LogicRuleIR = {
  version: LOGIC_IR_VERSION,
  kind: "rule",
  modality: "oblige",
  variables: [{ name: "X", type: "entity" }],
  head: {
    kind: "atom",
    name: "retain",
    args: [{ kind: "var", name: "X", type: "entity" }],
  },
  body: {
    kind: "atom",
    name: "customer",
    args: [{ kind: "var", name: "X", type: "entity" }],
  },
};
const valid = validateLogicIr(rule);
const SEM = logicSemanticKey(valid.normalized as LogicRuleIR);
const short = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 16).toUpperCase();

describe("logicRuleFactId", () => {
  test("hashes the semantic key", () => {
    expect(logicRuleFactId("SEM-1")).toBe(`FACT-RULE-${short("SEM-1")}`);
    expect(logicRuleFactId("SEM-1")).toMatch(/^FACT-RULE-[0-9A-F]{16}$/);
  });
});

describe("buildLogicApplyPlan", () => {
  test("rejects invalid IR with its errors", () => {
    expect(() =>
      buildLogicApplyPlan({
        text: "x",
        logic: { version: "bad" } as never,
        source: "s",
      }),
    ).toThrow(
      `Logic IR validation failed: ${validateLogicIr({ version: "bad" }).errors.join("; ")}`,
    );
  });

  test("plans the schema, rule and requirement", () => {
    const text = "  Intro. Customers must be retained.  ";
    const claim = "Customers must be retained";
    const result = buildLogicApplyPlan({
      text,
      logic: rule,
      source: "docs/a.md",
      claimText: ` ${claim}. `,
      claimKey: "retain-customers",
      existingLogicClaims: ["older", "retain-customers"],
    });
    const ruleId = `FACT-RULE-${short(SEM)}`;
    const start = Buffer.byteLength(text.slice(0, text.indexOf(claim)));
    expect(result).toStrictEqual({
      normalized: valid.normalized as LogicRuleIR,
      ruleHash: valid.ruleHash as string,
      semanticKey: SEM,
      claimKey: "retain-customers",
      claimText: claim,
      renderedProlog: valid.renderedProlog as string,
      applyPlan: [
        {
          type: "fact",
          id: "FACT-RULE-SCHEMA-LOGIC-V1",
          properties: {
            title: "kibi.logic.v1 rule schema",
            status: "active",
            source: "docs/a.md",
            fact_kind: "rule_schema",
            rule_name: "kibi.logic.v1",
            argument_names: ["rule_ir"],
            argument_types: ["logic_ir"],
            aliases: ["conditional rule", "constraint", "policy rule"],
            examples: [valid.renderedProlog as string],
          },
          relationships: [],
        },
        {
          type: "fact",
          id: ruleId,
          properties: {
            title: `Rule: ${claim}`,
            status: "active",
            source: "docs/a.md",
            fact_kind: "rule",
            rule_ir: valid.normalized,
            rule_hash: valid.ruleHash,
            semantic_key: SEM,
            rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
            rule_name: "kibi.logic.v1",
            canonical_key: SEM,
            claim_key: "retain-customers",
            claim_text: claim,
            claim_span_start: start,
            claim_span_end: start + claim.length,
            tags: ["lane:logic", "logic-ir-v1"],
          },
          relationships: [],
        },
        {
          type: "req",
          id: `REQ-LOGIC-${short(claim)}`,
          properties: {
            title: claim,
            status: "open",
            source: "docs/a.md",
            semantic_text: text.trim(),
            logic_claims: ["older", "retain-customers"],
            semantic_clauses: [claim],
            semantic_inventory_version: "kibi.semantic-inventory.v1",
            semantic_source_field: "semantic_text",
            semantic_source_hash: semanticSourceHash(text.trim()),
            semantic_inventory: [
              {
                claim_key: "retain-customers",
                claim_text: claim,
                role: "normative",
                status: "modeled",
                span: { start, end: start + claim.length },
                semantic_key: SEM,
              },
            ],
          },
          relationships: [
            {
              type: "requires_rule",
              from: `REQ-LOGIC-${short(claim)}`,
              to: ruleId,
            },
          ],
        },
      ],
    });
  });

  test("uses the text, a derived key and a supplied requirement and schema", () => {
    const logic = { ...rule, ruleSchemaId: "FACT-MY-SCHEMA" };
    const result = buildLogicApplyPlan({
      text: "Customers must be retained.",
      logic,
      source: "s",
      claimText: "   ",
      claimKey: "",
      requirementId: "REQ-9",
    });
    expect(result.claimText).toBe("Customers must be retained");
    expect(result.claimKey).not.toBe("");
    expect(result.claimKey).toMatch(/\S/);
    expect(result.applyPlan).toHaveLength(2);
    const [ruleFact, req] = result.applyPlan as Array<{
      id: string;
      properties: Record<string, unknown>;
      relationships: unknown[];
    }>;
    expect(ruleFact?.properties.rule_schema_id).toBe("FACT-MY-SCHEMA");
    expect(ruleFact?.properties.rule_name).toBe("FACT-MY-SCHEMA");
    expect(ruleFact?.properties.claim_span_start).toBe(0);
    expect(ruleFact?.properties.claim_span_end).toBe(26);
    expect(req?.id).toBe("REQ-9");
    expect(req?.properties.logic_claims).toStrictEqual([result.claimKey]);
    expect(req?.relationships).toStrictEqual([
      { type: "requires_rule", from: "REQ-9", to: ruleFact?.id },
    ]);
  });

  test("spans the claim from the start when the text does not contain it", () => {
    const result = buildLogicApplyPlan({
      text: "Something else entirely",
      logic: rule,
      source: "s",
      claimText: "Ünïcode claim",
    });
    const ruleFact = result.applyPlan[1] as {
      properties: Record<string, unknown>;
    };
    expect(ruleFact.properties.claim_span_start).toBe(0);
    expect(ruleFact.properties.claim_span_end).toBe(
      Buffer.byteLength(
        "Something else entirely".slice(0, "Ünïcode claim".length),
      ),
    );
  });

  test("trims the text before normalizing it into the claim", () => {
    const result = buildLogicApplyPlan({
      text: "  - Customers must be retained.  ",
      logic: rule,
      source: "s",
    });
    expect(result.claimText).toBe("Customers must be retained");
    const ruleFact = result.applyPlan[1] as {
      properties: Record<string, unknown>;
    };
    expect(ruleFact.properties.claim_span_start).toBe(4);
    expect(ruleFact.properties.claim_span_end).toBe(30);
  });

  test("prefers the advisor's role for the claim", () => {
    const result = buildLogicApplyPlan({
      text: "Customers must be retained unless they opt out.",
      logic: rule,
      source: "s",
    });
    const req = result.applyPlan[2] as {
      properties: { semantic_inventory: Array<{ role: string }> };
    };
    expect(req.properties.semantic_inventory[0]?.role).toBe("exception");
  });

  test("titles an empty claim generically", () => {
    const result = buildLogicApplyPlan({
      text: "   ",
      logic: rule,
      source: "s",
    });
    const req = result.applyPlan[2] as { properties: Record<string, unknown> };
    expect(req.properties.title).toBe("Typed logical requirement");
  });
});
