import { describe, expect, test } from "bun:test";

import {
  LOGIC_IR_VERSION,
  type LogicRuleIR,
  validateLogicIr,
} from "../../src/logic/ir.js";
import {
  factKindShapeHints,
  validateFactModelingShape,
  valueFieldHint,
} from "../../src/operations/mutation/strict-fact.js";

const validRule: LogicRuleIR = {
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

describe("valueFieldHint", () => {
  test("describes the typed field for each JSON value kind", () => {
    expect(valueFieldHint(true)).toContain('value_type: "bool"');
    expect(valueFieldHint(7)).toContain("value_int");
    expect(valueFieldHint(1.5)).toContain("value_number");
    expect(valueFieldHint("held")).toContain("value_string");
    expect(valueFieldHint({ nested: true })).toContain(
      "exactly one of value_string",
    );
  });
});

describe("factKindShapeHints", () => {
  test("returns no hints for non-facts and well-formed facts", () => {
    expect(factKindShapeHints({ type: "req" })).toEqual([]);
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "observation",
      }),
    ).toEqual([]);
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "property_value",
        subject_key: "session",
        property_key: "ttl",
        operator: "eq",
        value_type: "int",
        value_int: 7,
      }),
    ).toEqual([]);
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "rule_schema",
        rule_name: "kibi.logic.v1",
        argument_names: ["rule_ir"],
        argument_types: ["logic_ir"],
      }),
    ).toEqual([]);
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "rule",
        rule_ir: validRule,
        rule_hash: "abc",
        rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
        rule_name: "kibi.logic.v1",
        semantic_key: "key",
      }),
    ).toEqual([]);
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "predicate",
        predicate_name: "retains",
        predicate_args: ["customer.data"],
        canonical_key: "retains:customer.data",
      }),
    ).toEqual([]);
  });

  test("explains missing property_value, rule_schema, rule, and predicate fields", () => {
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "property_value" }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires subject_key"),
        expect.stringContaining("exactly one typed value field"),
        expect.stringContaining("Next action: use kb_model_requirement"),
      ]),
    );
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "property_value",
        subject_key: "s",
        property_key: "p",
        operator: "eq",
        value_type: "string",
        value_string: "a",
        value_int: 1,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("exactly one typed value field"),
      ]),
    );
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "rule_schema" }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires rule_name"),
        expect.stringContaining("define the kibi.logic.v1 schema"),
      ]),
    );
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "rule_schema",
        rule_name: "kibi.logic.v1",
        argument_names: ["a"],
        argument_types: ["x", "y"],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("equal lengths"),
      ]),
    );
    expect(factKindShapeHints({ type: "fact", fact_kind: "rule" })).toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires rule_ir"),
        expect.stringContaining("typed kibi.logic.v1 IR"),
      ]),
    );
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "predicate" }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires predicate_name"),
        expect.stringContaining("kb_suggest_predicates"),
      ]),
    );
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "predicate",
        predicate_name: "retains",
        predicate_args: [],
        canonical_key: "k",
      }),
    ).toEqual(
      expect.arrayContaining([expect.stringContaining("predicate_args")]),
    );
  });
});

describe("validateFactModelingShape", () => {
  test("throws the collected shape hints", () => {
    expect(() =>
      validateFactModelingShape({ type: "fact", fact_kind: "property_value" }),
    ).toThrow(/Entity validation failed: fact_kind 'property_value'/);
  });

  test("validates rule IR hashes, semantic keys, and required string fields", () => {
    expect(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "rule",
        rule_ir: { version: "bad" },
        rule_hash: "x",
        rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
        rule_name: "kibi.logic.v1",
        semantic_key: "x",
      }),
    ).toThrow(/rule_ir is unsafe or malformed/);

    const validated = validateLogicIr(validRule);
    expect(validated.valid).toBe(true);
    const valid = {
      type: "fact",
      fact_kind: "rule",
      rule_ir: validRule,
      rule_hash: validated.ruleHash,
      rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
      rule_name: "kibi.logic.v1",
      semantic_key: validated.semanticKey,
    };
    expect(() =>
      validateFactModelingShape({ ...valid, rule_hash: "deadbeef" }),
    ).toThrow(/rule_hash must equal/);
    expect(() =>
      validateFactModelingShape({ ...valid, semantic_key: "wrong" }),
    ).toThrow(/semantic_key must equal/);
    expect(() =>
      validateFactModelingShape({
        ...valid,
        rule_schema_id: "   ",
      }),
    ).toThrow(/requires rule_schema_id/);
    expect(() =>
      validateFactModelingShape({
        ...valid,
        rule_name: "",
      }),
    ).toThrow(/requires rule_name/);

    expect(() => validateFactModelingShape(valid)).not.toThrow();
  });

  test("validates rule_schema names and argument arity", () => {
    expect(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "rule_schema",
        rule_name: "   ",
        argument_names: ["a"],
        argument_types: ["t"],
      }),
    ).toThrow(/requires rule_name/);
    expect(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "rule_schema",
        rule_name: "kibi.logic.v1",
        argument_names: ["a"],
        argument_types: ["t", "u"],
      }),
    ).toThrow(/equal lengths/);
    expect(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "rule_schema",
        rule_name: "kibi.logic.v1",
        argument_names: ["a"],
        argument_types: ["t"],
      }),
    ).not.toThrow();
  });
});
