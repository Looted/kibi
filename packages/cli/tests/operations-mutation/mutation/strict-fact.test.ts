import { describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
import {
  LOGIC_IR_VERSION,
  type LogicRuleIR,
  validateLogicIr,
} from "../../../src/logic/ir.js";
import {
  assertRuleSchemaArity,
  factKindShapeHints,
  validateFactModelingShape,
  valueFieldHint,
} from "../../../src/operations/mutation/strict-fact.js";

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
const validation = validateLogicIr(validRule);

function rejected(run: () => void): KbRejection {
  try {
    run();
  } catch (error) {
    if (error instanceof KbRejection) {
      expect(error.code).toBe("ENTITY_VALIDATION_FAILED");
      return error;
    }
    throw error;
  }
  throw new Error("expected a rejection");
}

const PV_NEXT =
  "Next action: use kb_model_requirement for prose claims, or provide subject_key, property_key, operator, value_type, and one value_* field in kb_upsert.properties.";
const PV_ONE =
  "fact_kind 'property_value' requires exactly one typed value field: value_string, value_int, value_number, value_bool, or value_set.";
const SCHEMA_NEXT =
  "Next action: define the kibi.logic.v1 schema before creating rule facts.";
const RULE_NEXT =
  "Next action: call kb_model_requirement with typed kibi.logic.v1 IR; raw Prolog is not accepted.";
const PREDICATE_NEXT =
  "Next action: call kb_model with mode predicates (CLI: kibi suggest-predicates) and apply its planned fact instead of hand-writing ontology predicate facts.";

describe("valueFieldHint", () => {
  test("names the typed field for each value kind", () => {
    expect(valueFieldHint(true)).toBe(
      'Use value_type: "bool" plus value_bool: true.',
    );
    expect(valueFieldHint(7)).toBe('Use value_type: "int" plus value_int: 7.');
    expect(valueFieldHint(1.5)).toBe(
      'Use value_type: "number" plus value_number: 1.5.',
    );
    expect(valueFieldHint("a")).toBe(
      'Use value_type: "string" plus value_string: "a".',
    );
    expect(valueFieldHint(["a"])).toBe(
      'Use value_type: "set" plus value_set: ["a"].',
    );
    expect(valueFieldHint(null)).toBe(
      "Use value_type plus exactly one of value_string, value_int, value_number, value_bool, or value_set.",
    );
  });
});

describe("factKindShapeHints", () => {
  test("ignores non-facts and unknown fact kinds", () => {
    expect(
      factKindShapeHints({ type: "req", fact_kind: "property_value" }),
    ).toStrictEqual([]);
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "observation" }),
    ).toStrictEqual([]);
  });

  test("property_value needs its fields and exactly one value", () => {
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "property_value" }),
    ).toStrictEqual([
      "fact_kind 'property_value' requires subject_key, property_key, operator, value_type.",
      PV_ONE,
      PV_NEXT,
    ]);
    const complete = {
      type: "fact",
      fact_kind: "property_value",
      subject_key: "s",
      property_key: "p",
      operator: "eq",
      value_type: "int",
    };
    for (const field of [
      "value_string",
      "value_int",
      "value_number",
      "value_bool",
      "value_set",
    ]) {
      expect(factKindShapeHints({ ...complete, [field]: 1 })).toStrictEqual([]);
    }
    expect(
      factKindShapeHints({ ...complete, value_int: 1, value_set: ["a"] }),
    ).toStrictEqual([PV_ONE, PV_NEXT]);
    expect(
      factKindShapeHints({ ...complete, operator: undefined, value_int: 1 }),
    ).toStrictEqual(["fact_kind 'property_value' requires operator.", PV_NEXT]);
  });

  test("rule_schema needs its fields with equal lengths", () => {
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "rule_schema" }),
    ).toStrictEqual([
      "fact_kind 'rule_schema' requires rule_name, argument_names, argument_types.",
      SCHEMA_NEXT,
    ]);
    const schema = { type: "fact", fact_kind: "rule_schema", rule_name: "r" };
    expect(
      factKindShapeHints({
        ...schema,
        argument_names: ["a"],
        argument_types: ["x", "y"],
      }),
    ).toStrictEqual([
      "fact_kind 'rule_schema' requires argument_names and argument_types with equal lengths.",
      SCHEMA_NEXT,
    ]);
    expect(
      factKindShapeHints({
        ...schema,
        argument_names: "a",
        argument_types: ["x"],
      }),
    ).toHaveLength(2);
    expect(
      factKindShapeHints({
        ...schema,
        argument_names: ["a"],
        argument_types: "x",
      }),
    ).toHaveLength(2);
    expect(
      factKindShapeHints({
        ...schema,
        argument_names: ["a"],
        argument_types: ["x"],
      }),
    ).toStrictEqual([]);
  });

  test("rule needs its fields", () => {
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "rule" }),
    ).toStrictEqual([
      "fact_kind 'rule' requires rule_ir, rule_hash, rule_schema_id, rule_name, semantic_key.",
      RULE_NEXT,
    ]);
    expect(
      factKindShapeHints({
        type: "fact",
        fact_kind: "rule",
        rule_ir: {},
        rule_hash: "h",
        rule_schema_id: "s",
        rule_name: "n",
        semantic_key: "k",
      }),
    ).toStrictEqual([]);
  });

  test("predicate needs a name, arguments and a canonical key", () => {
    expect(
      factKindShapeHints({ type: "fact", fact_kind: "predicate" }),
    ).toStrictEqual([
      "fact_kind 'predicate' requires predicate_name, predicate_args, canonical_key.",
      PREDICATE_NEXT,
    ]);
    const predicate = {
      type: "fact",
      fact_kind: "predicate",
      predicate_name: "p",
      predicate_args: ["a"],
      canonical_key: "p:a",
    };
    expect(factKindShapeHints(predicate)).toStrictEqual([]);
    expect(
      factKindShapeHints({ ...predicate, predicate_args: [] }),
    ).toStrictEqual([
      "fact_kind 'predicate' requires predicate_args.",
      PREDICATE_NEXT,
    ]);
    expect(
      factKindShapeHints({ ...predicate, predicate_args: "a" }),
    ).toStrictEqual([
      "fact_kind 'predicate' requires predicate_args.",
      PREDICATE_NEXT,
    ]);
  });
});

describe("assertRuleSchemaArity", () => {
  test("accepts equal-length lists and rejects anything else", () => {
    expect(() => assertRuleSchemaArity(["a"], ["x"])).not.toThrow();
    for (const [names, types] of [
      ["a", ["x"]],
      [["a"], "x"],
      [["a"], ["x", "y"]],
    ]) {
      const error = rejected(() => assertRuleSchemaArity(names, types));
      expect(error.code).toBe("ENTITY_VALIDATION_FAILED");
      expect(error.message).toBe(
        "Entity validation failed: rule_schema argument_names and argument_types must have equal lengths",
      );
      expect(error.issues).toStrictEqual([
        { rule: "rule_schema_arity", field: "argument_types" },
      ]);
    }
  });
});

describe("validateFactModelingShape", () => {
  const rule = {
    type: "fact",
    fact_kind: "rule",
    rule_ir: validRule,
    rule_hash: validation.ruleHash,
    rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
    rule_name: "kibi.logic.v1",
    semantic_key: validation.semanticKey,
  };

  test("rejects a shape hint", () => {
    const error = rejected(() =>
      validateFactModelingShape({ type: "fact", fact_kind: "rule" }),
    );
    expect(error.message).toBe(
      `Entity validation failed: fact_kind 'rule' requires rule_ir, rule_hash, rule_schema_id, rule_name, semantic_key.; ${RULE_NEXT}`,
    );
    expect(error.issues).toStrictEqual([
      { rule: "fact_kind_shape", field: "fact_kind" },
    ]);
  });

  test("rejects a vocabulary outside a predicate schema", () => {
    const error = rejected(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "observation",
        argument_constants: {},
      }),
    );
    expect(error.message).toBe(
      "Entity validation failed: argument_constants and argument_aliases are only valid on fact_kind predicate_schema",
    );
    expect(error.issues).toStrictEqual([
      { rule: "predicate_vocabulary", field: "predicate_name" },
    ]);
  });

  test("joins every vocabulary error", () => {
    const error = rejected(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "predicate_schema",
        predicate_name: "p",
        argument_names: ["a"],
        argument_constants: "{",
        argument_aliases: "[1]",
      }),
    );
    expect(error.message).toBe(
      "Entity validation failed: argument_constants must map argument names to constant lists; argument_aliases must map argument names to alias-to-constant objects",
    );
  });

  test("checks rule_name only on rule_schema facts", () => {
    expect(() =>
      validateFactModelingShape({ type: "fact", fact_kind: "observation" }),
    ).not.toThrow();
    expect(() =>
      validateFactModelingShape({ type: "req", fact_kind: "rule_schema" }),
    ).not.toThrow();
  });

  test("accepts a valid rule and other entities", () => {
    expect(() => validateFactModelingShape(rule)).not.toThrow();
    expect(() => validateFactModelingShape({ type: "req" })).not.toThrow();
    expect(() =>
      validateFactModelingShape({
        ...rule,
        rule_hash: undefined,
        semantic_key: undefined,
      }),
    ).toThrow(/requires rule_hash, semantic_key/);
  });

  test("rejects an invalid rule IR", () => {
    const error = rejected(() =>
      validateFactModelingShape({ ...rule, rule_ir: { version: "bad" } }),
    );
    expect(error.message).toStartWith(
      "Entity validation failed: rule_ir is unsafe or malformed (",
    );
    expect(error.message).toBe(
      `Entity validation failed: rule_ir is unsafe or malformed (${validateLogicIr({ version: "bad" }).errors.join("; ")})`,
    );
    expect(error.issues).toStrictEqual([
      { rule: "rule_ir_invalid", field: "rule_ir" },
    ]);
  });

  test("rejects a mismatched hash or semantic key", () => {
    const hash = rejected(() =>
      validateFactModelingShape({ ...rule, rule_hash: "x" }),
    );
    expect(hash.message).toBe(
      `Entity validation failed: rule_hash must equal ${validation.ruleHash}`,
    );
    expect(hash.issues).toStrictEqual([
      { rule: "rule_hash_mismatch", field: "rule_hash" },
    ]);
    const key = rejected(() =>
      validateFactModelingShape({ ...rule, semantic_key: "x" }),
    );
    expect(key.message).toBe(
      `Entity validation failed: semantic_key must equal ${validation.semanticKey}`,
    );
    expect(key.issues).toStrictEqual([
      { rule: "semantic_key_mismatch", field: "semantic_key" },
    ]);
  });

  test("requires a rule's schema id and name as text", () => {
    for (const field of ["rule_schema_id", "rule_name"] as const) {
      for (const value of [7, "  "]) {
        const error = rejected(() =>
          validateFactModelingShape({ ...rule, [field]: value }),
        );
        expect(error.message).toBe(
          `Entity validation failed: fact_kind 'rule' requires ${field}`,
        );
        expect(error.issues).toStrictEqual([{ rule: "required", field }]);
      }
    }
  });

  test("checks a rule schema's name and arity", () => {
    const schema = {
      type: "fact",
      fact_kind: "rule_schema",
      rule_name: "r",
      argument_names: ["a"],
      argument_types: ["x"],
    };
    expect(() => validateFactModelingShape(schema)).not.toThrow();
    for (const rule_name of [3, " "]) {
      const error = rejected(() =>
        validateFactModelingShape({ ...schema, rule_name }),
      );
      expect(error.message).toBe(
        "Entity validation failed: fact_kind 'rule_schema' requires rule_name",
      );
      expect(error.issues).toStrictEqual([
        { rule: "required", field: "rule_name" },
      ]);
    }
    expect(() =>
      validateFactModelingShape({
        ...schema,
        type: "req",
        argument_types: ["x", "y"],
      }),
    ).not.toThrow();
    expect(() =>
      validateFactModelingShape({ ...rule, type: "req", rule_hash: "x" }),
    ).not.toThrow();
  });
});
