import { validateLogicIr } from "../../logic/ir.js";

const PROPERTY_VALUE_FIELDS = [
  "value_string",
  "value_int",
  "value_number",
  "value_bool",
] as const;

// implements REQ-kibi-operation-interface-parity
export function valueFieldHint(value: unknown): string {
  if (typeof value === "boolean") {
    return `Use value_type: "bool" plus value_bool: ${String(value)}.`;
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `Use value_type: "int" plus value_int: ${String(value)}.`
      : `Use value_type: "number" plus value_number: ${String(value)}.`;
  }
  if (typeof value === "string") {
    return `Use value_type: "string" plus value_string: ${JSON.stringify(value)}.`;
  }
  return "Use value_type plus exactly one of value_string, value_int, value_number, or value_bool.";
}

// implements REQ-kibi-operation-interface-parity
export function factKindShapeHints(
  entity: Readonly<Record<string, unknown>>,
): string[] {
  if (entity.type !== "fact") return [];
  if (entity.fact_kind === "property_value") {
    const missing = [
      "subject_key",
      "property_key",
      "operator",
      "value_type",
    ].filter((field) => entity[field] === undefined);
    const present = PROPERTY_VALUE_FIELDS.filter(
      (field) => entity[field] !== undefined,
    );
    const hints: string[] = [];
    if (missing.length > 0) {
      hints.push(`fact_kind 'property_value' requires ${missing.join(", ")}.`);
    }
    if (present.length !== 1) {
      hints.push(
        "fact_kind 'property_value' requires exactly one typed value field: value_string, value_int, value_number, or value_bool.",
      );
    }
    if (hints.length > 0) {
      hints.push(
        "Next action: use kb_model_requirement for prose claims, or provide subject_key, property_key, operator, value_type, and one value_* field in kb_upsert.properties.",
      );
    }
    return hints;
  }
  if (entity.fact_kind === "rule_schema") {
    const missing = ["rule_name", "argument_names", "argument_types"].filter(
      (field) => entity[field] === undefined,
    );
    const equalLengths =
      Array.isArray(entity.argument_names) &&
      Array.isArray(entity.argument_types) &&
      entity.argument_names.length === entity.argument_types.length;
    const hints =
      missing.length > 0
        ? [`fact_kind 'rule_schema' requires ${missing.join(", ")}.`]
        : equalLengths
          ? []
          : [
              "fact_kind 'rule_schema' requires argument_names and argument_types with equal lengths.",
            ];
    return hints.length > 0
      ? [
          ...hints,
          "Next action: define the kibi.logic.v1 schema before creating rule facts.",
        ]
      : [];
  }
  if (entity.fact_kind === "rule") {
    const missing = [
      "rule_ir",
      "rule_hash",
      "rule_schema_id",
      "rule_name",
      "semantic_key",
    ].filter((field) => entity[field] === undefined);
    return missing.length > 0
      ? [
          `fact_kind 'rule' requires ${missing.join(", ")}.`,
          "Next action: call kb_model_requirement with typed kibi.logic.v1 IR; raw Prolog is not accepted.",
        ]
      : [];
  }
  if (entity.fact_kind !== "predicate") return [];
  const args = entity.predicate_args;
  const missing = [
    ...(entity.predicate_name === undefined ? ["predicate_name"] : []),
    ...(!Array.isArray(args) || args.length === 0 ? ["predicate_args"] : []),
    ...(entity.canonical_key === undefined ? ["canonical_key"] : []),
  ];
  if (missing.length !== 0)
    return [
      `fact_kind 'predicate' requires ${missing.join(", ")}.`,
      "Next action: call kb_suggest_predicates before hand-writing ontology predicate facts.",
    ];
  return [];
}

// implements REQ-kibi-operation-interface-parity
export function validateFactModelingShape(
  entity: Readonly<Record<string, unknown>>,
): void {
  const hints = factKindShapeHints(entity);
  if (hints.length > 0) {
    throw new Error(`Entity validation failed: ${hints.join("; ")}`);
  }
  if (entity.type === "fact" && entity.fact_kind === "rule") {
    const validation = validateLogicIr(entity.rule_ir);
    if (!validation.valid || !validation.semanticKey) {
      throw new Error(
        `Entity validation failed: rule_ir is unsafe or malformed (${validation.errors.join("; ")})`,
      );
    }
    if (
      entity.rule_hash !== undefined &&
      entity.rule_hash !== validation.ruleHash
    ) {
      throw new Error(
        `Entity validation failed: rule_hash must equal ${validation.ruleHash}`,
      );
    }
    if (
      entity.semantic_key !== undefined &&
      entity.semantic_key !== validation.semanticKey
    ) {
      throw new Error(
        `Entity validation failed: semantic_key must equal ${validation.semanticKey}`,
      );
    }
    for (const field of ["rule_schema_id", "rule_name"] as const) {
      if (typeof entity[field] !== "string" || entity[field].trim() === "") {
        throw new Error(
          `Entity validation failed: fact_kind 'rule' requires ${field}`,
        );
      }
    }
  }
  if (entity.type === "fact" && entity.fact_kind === "rule_schema") {
    if (
      typeof entity.rule_name !== "string" ||
      entity.rule_name.trim() === ""
    ) {
      throw new Error(
        "Entity validation failed: fact_kind 'rule_schema' requires rule_name",
      );
    }
    if (
      !Array.isArray(entity.argument_names) ||
      !Array.isArray(entity.argument_types) ||
      entity.argument_names.length !== entity.argument_types.length
    ) {
      throw new Error(
        "Entity validation failed: rule_schema argument_names and argument_types must have equal lengths",
      );
    }
  }
}
